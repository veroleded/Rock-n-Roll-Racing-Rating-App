import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { QueuesService } from '../services/queues/queues.service';
import { publicProcedure, router } from '../trpc';
import { verifyBotSignature } from '../utils/botSignature';

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
        const { timestamp, signature, ...data } = input;
        if (!verifyBotSignature(timestamp, signature, JSON.stringify(data))) {
          throw new TRPCError({ code: 'UNAUTHORIZED' });
        }
        const queuesService = new QueuesService(ctx.prisma);
        return queuesService.addPlayerToQueue(data.userId, data.channelName);
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
        const { timestamp, signature, ...data } = input;
        if (!verifyBotSignature(timestamp, signature, JSON.stringify(data))) {
          throw new TRPCError({ code: 'UNAUTHORIZED' });
        }
        const queuesService = new QueuesService(ctx.prisma);
        return queuesService.addBotToQueue(data.channelName);
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
    .mutation(async ({ ctx, input }) => {
      try {
        if (!verifyBotSignature(input.timestamp, input.signature)) {
          throw new TRPCError({ code: 'UNAUTHORIZED' });
        }
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
        const { timestamp, signature, ...data } = input;
        if (!verifyBotSignature(timestamp, signature, JSON.stringify(data))) {
          throw new TRPCError({ code: 'UNAUTHORIZED' });
        }
        const queuesService = new QueuesService(ctx.prisma);
        return queuesService.removePlayerFromQueue(data.userId, data.channelName);
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
        const { timestamp, signature, ...data } = input;
        if (!verifyBotSignature(timestamp, signature, JSON.stringify(data))) {
          throw new TRPCError({ code: 'UNAUTHORIZED' });
        }
        const queuesService = new QueuesService(ctx.prisma);
        return queuesService.removeBotFromQueue(data.channelName);
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
        const { timestamp, signature, ...data } = input;
        if (!verifyBotSignature(timestamp, signature, JSON.stringify(data))) {
          throw new TRPCError({ code: 'UNAUTHORIZED' });
        }
        const queuesService = new QueuesService(ctx.prisma);
        return queuesService.cleanQueueByChannel(data.channelName);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Не удалось очистить очередь',
        });
      }
    }),
});
