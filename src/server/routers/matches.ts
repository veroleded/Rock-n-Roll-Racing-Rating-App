import { GameMode } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { MatchService, createMatchDataSchema, editMatchDataSchema } from "../services/match";
import type { TRPCContext } from '../trpc';
import { moderatorOrAdminProcedure, protectedProcedure, router } from "../trpc";

async function assertModeratorCanChangeMatch(ctx: TRPCContext, matchId: string) {
  if (ctx.session?.user.role !== 'MODERATOR') return;

  const exists = await ctx.prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true },
  });

  if (!exists) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Матч не найден' });
  }

  const last = await ctx.prisma.match.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (!last || last.id !== matchId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Модератор может изменять или удалять только последний матч',
    });
  }
}



export const matchesRouter = router({
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
        penaltyFactor: createMatchDataSchema.shape.penaltyFactor,
        isTraining: createMatchDataSchema.shape.isTraining,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const matchService = new MatchService(ctx.prisma);
      return matchService.create({
        ...input,
        creatorId: ctx.session.user.id,
      });
    }),

  edit: moderatorOrAdminProcedure
    .input(
      z.object({
        mode: editMatchDataSchema.shape.mode,
        players: editMatchDataSchema.shape.players,
        statsData: editMatchDataSchema.shape.statsData,
        editMatchId: editMatchDataSchema.shape.editMatchId,
        penaltyFactor: editMatchDataSchema.shape.penaltyFactor,
        isTraining: editMatchDataSchema.shape.isTraining,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertModeratorCanChangeMatch(ctx, input.editMatchId);
      const matchService = new MatchService(ctx.prisma);
      return matchService.edit({ ...input, creatorId: ctx.session.user.id });
    }),

  byId: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const matchService = new MatchService(ctx.prisma);
    const match = await matchService.findById(input);

    if (!match) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Match not found',
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

  delete: moderatorOrAdminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    try {
      await assertModeratorCanChangeMatch(ctx, input);
      const matchService = new MatchService(ctx.prisma);
      const match = await matchService.delete(input);
      return match;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Матч не найден',
        });
      }
      throw error;
    }
  }),
});
