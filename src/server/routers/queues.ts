import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { QueuesService } from '../services/queues/queues.service';
import { publicProcedure, router } from '../trpc';

export const queuesRouter = router({
  addPlayer: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        channelName: z.string(),
        timestamp: z.string(),
        signature: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const queuesService = new QueuesService(ctx.prisma);
        return queuesService.addPlayerToQueue(input.userId, input.channelName);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Не удалось добавить игрока в очередь',
        });
      }
    }),

  addBot: publicProcedure
    .input(
      z.object({
        channelName: z.string(),
        timestamp: z.string(),
        signature: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const queuesService = new QueuesService(ctx.prisma);
        return queuesService.addBotToQueue(input.channelName);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Не удалось добавить бота в очередь',
        });
      }
    }),

  cleanOld: publicProcedure
    .input(
      z.object({
        timestamp: z.string(),
        signature: z.string(),
      })
    )
    .mutation(async ({ ctx }) => {
      try {
        const queuesService = new QueuesService(ctx.prisma);
        const oldQueues = await queuesService.cleanOldQueues();
        return oldQueues;
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Не удалось очистить старые очереди',
        });
      }
    }),

  removePlayer: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        channelName: z.string(),
        timestamp: z.string(),
        signature: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const queuesService = new QueuesService(ctx.prisma);
        return queuesService.removePlayerFromQueue(input.userId, input.channelName);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Не удалось удалить игрока из очереди',
        });
      }
    }),

  removeBot: publicProcedure
    .input(
      z.object({
        channelName: z.string(),
        timestamp: z.string(),
        signature: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const queuesService = new QueuesService(ctx.prisma);
        return queuesService.removeBotFromQueue(input.channelName);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Не удалось удалить бота из очереди',
        });
      }
    }),

  cleanQueue: publicProcedure
    .input(
      z.object({
        channelName: z.string(),
        timestamp: z.string(),
        signature: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const queuesService = new QueuesService(ctx.prisma);
        return queuesService.cleanQueueByChannel(input.channelName);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Не удалось очистить очередь',
        });
      }
    }),
});
