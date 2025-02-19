import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../trpc";

export const usersRouter = router({
  // Получить текущего пользователя
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: { stats: true },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  // Получить список всех пользователей (только для админов)
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      include: { stats: true },
      orderBy: { stats: { rating: "desc" } },
    });
  }),

  // Получить пользователя по ID
  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: input },
      include: { stats: true },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  // Обновить пользователя (только для админов)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        role: z.enum(["ADMIN", "MODERATOR", "PLAYER"]).optional(),
        stats: z
          .object({
            rating: z.number(),
            wins: z.number(),
            losses: z.number(),
            draws: z.number(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, stats, ...userData } = input;

      const user = await ctx.prisma.user.update({
        where: { id },
        data: {
          ...userData,
          stats: stats
            ? {
                update: stats,
              }
            : undefined,
        },
        include: { stats: true },
      });

      return user;
    }),
});
