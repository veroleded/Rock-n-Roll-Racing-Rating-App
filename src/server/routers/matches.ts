import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../trpc";

export const matchesRouter = router({
  // Получить список всех матчей
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const limit = input.limit + 1;
      const matches = await ctx.prisma.match.findMany({
        take: limit,
        ...(input.cursor && {
          cursor: {
            id: input.cursor,
          },
        }),
        orderBy: {
          createdAt: "desc",
        },
        include: {
          players: {
            include: {
              user: true,
            },
          },
          creator: true,
        },
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (matches.length > input.limit) {
        const nextItem = matches.pop();
        nextCursor = nextItem?.id;
      }

      return {
        matches,
        nextCursor,
      };
    }),

  // Создать новый матч (только для админов)
  create: adminProcedure
    .input(
      z.object({
        mode: z.enum(["TWO_VS_TWO", "THREE_VS_THREE", "TWO_VS_TWO_VS_TWO"]),
        players: z.array(
          z.object({
            userId: z.string(),
            team: z.number(),
            position: z.number(),
            damage: z.number(),
            money: z.number(),
            wipeouts: z.number(),
          })
        ),
        gameFile: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const match = await ctx.prisma.match.create({
        data: {
          mode: input.mode,
          gameFile: input.gameFile,
          creatorId: ctx.session.user.id,
          status: "COMPLETED",
          players: {
            create: input.players,
          },
        },
        include: {
          players: {
            include: {
              user: true,
            },
          },
          creator: true,
        },
      });

      // Обновляем статистику игроков
      for (const player of input.players) {
        await ctx.prisma.stats.update({
          where: { userId: player.userId },
          data: {
            gamesPlayed: { increment: 1 },
            totalDamage: { increment: player.damage },
            totalMoney: { increment: player.money },
            wipeouts: { increment: player.wipeouts },
          },
        });
      }

      return match;
    }),

  // Получить детали матча
  byId: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const match = await ctx.prisma.match.findUnique({
      where: { id: input },
      include: {
        players: {
          include: {
            user: true,
          },
        },
        creator: true,
      },
    });

    if (!match) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Match not found",
      });
    }

    return match;
  }),
});
