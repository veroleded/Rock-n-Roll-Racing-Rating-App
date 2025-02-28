import { GameMode } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { MatchService, createMatchDataSchema } from "../services/match";
import { moderatorOrAdminProcedure, protectedProcedure, router } from "../trpc";

// Схема для валидации данных из файла stats.json

export const matchesRouter = router({
  // Получить список всех матчей
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        filters: z
          .object({
            userId: z.string().optional(),
            onlyRated: z.boolean().optional(),
            gameMode: z.nativeEnum(GameMode).optional(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const matchService = new MatchService(ctx.prisma);
      return matchService.findMany({
        limit: input.limit,
        offset: input.offset,
        filters: input.filters,
      });
    }),

  create: moderatorOrAdminProcedure
    .input(
      z.object({
        mode: createMatchDataSchema.shape.mode,
        players: createMatchDataSchema.shape.players,
        statsData: createMatchDataSchema.shape.statsData,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const matchService = new MatchService(ctx.prisma);
      return matchService.create({
        ...input,
        creatorId: ctx.session.user.id,
      });
    }),

  byId: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const matchService = new MatchService(ctx.prisma);
    const match = await matchService.findById(input);

    if (!match) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Match not found",
      });
    }

    return match;
  }),

  getMy: protectedProcedure.query(async ({ ctx }) => {
    const matchService = new MatchService(ctx.prisma);
    return matchService.findMany({
      filters: {
        userId: ctx.session.user.id,
      },
    });
  }),

  delete: moderatorOrAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const matchService = new MatchService(ctx.prisma);
      const match = await matchService.delete(input);

      if (!match) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Матч не найден",
        });
      }

      return match;
    }),
});
