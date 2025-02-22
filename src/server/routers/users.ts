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

  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const users = await ctx.prisma.user.findMany({
        where: {
          hasJoinedBot: true, // Только присоединившиеся к боту
        },
        include: {
          stats: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      if (!users || users.length === 0) {
        return [];
      }

      return users;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch users",
      });
    }
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

      // Проверяем, существует ли пользователь
      const existingUser = await ctx.prisma.user.findUnique({
        where: { id },
        select: { role: true },
      });

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Пользователь не найден",
        });
      }

      // Проверяем, не пытаемся ли мы изменить роль администратора
      if (
        existingUser.role === "ADMIN" &&
        userData.role &&
        userData.role !== "ADMIN"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Нельзя изменить роль администратора",
        });
      }

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

  // Удалить пользователя (только для админов)
  delete: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    // Проверяем, существует ли пользователь
    const user = await ctx.prisma.user.findUnique({
      where: { id: input },
      select: { role: true },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Пользователь не найден",
      });
    }

    // Проверяем, не пытаемся ли мы удалить администратора
    if (user.role === "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Нельзя удалить администратора",
      });
    }

    // Удаляем пользователя
    await ctx.prisma.user.delete({
      where: { id: input },
    });

    return { success: true };
  }),
});
