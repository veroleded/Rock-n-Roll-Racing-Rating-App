import { GameMode, PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { publishQueueEvent, QueueEventType } from './queue-events';

export class QueuesService {
  constructor(private prisma: PrismaClient) {}

  private getRequiredPlayersCount(gameType: GameMode): number {
    switch (gameType) {
      case 'THREE_VS_THREE':
      case 'THREE_VS_THREE_HIGH_MMR':
        return 6;
      case 'TWO_VS_TWO':
      case 'TWO_VS_TWO_HIGH_MMR':
        return 4;
      case 'TWO_VS_TWO_VS_TWO':
        return 6;
    }
  }

  async addPlayerToQueue(userId: string, channelName: string) {
    let gameType: GameMode;
    // Проверяем в порядке от более специфичных к менее специфичным
    if (channelName.includes('2x2x2')) {
      gameType = 'TWO_VS_TWO_VS_TWO';
    } else if (channelName.includes('3x3')) {
      gameType = channelName.includes('high-mmr') ? 'THREE_VS_THREE_HIGH_MMR' : 'THREE_VS_THREE';
    } else if (channelName.includes('2x2')) {
      gameType = channelName.includes('high-mmr') ? 'TWO_VS_TWO_HIGH_MMR' : 'TWO_VS_TWO';
    } else {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Неверный тип игры',
      });
    }

    let queue = await this.prisma.queue.findFirst({
      where: {
        gameType,
        isCompleted: false,
      },
      include: {
        players: {
          include: {
            stats: true,
          },
        },
      },
    });

    if (queue?.players.some((player) => player.id === userId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Вы уже находитесь в очереди',
      });
    }

    if (!queue) {
      queue = await this.prisma.queue.create({
        data: {
          gameType,
          lastAdded: new Date(),
          players: {
            connect: [{ id: userId }],
          },
        },
        include: {
          players: {
            include: {
              stats: true,
            },
          },
        },
      });
    } else {
      queue = await this.prisma.queue.update({
        where: { id: queue.id },
        data: {
          lastAdded: new Date(),
          players: {
            connect: [{ id: userId }],
          },
        },
        include: {
          players: {
            include: {
              stats: true,
            },
          },
        },
      });
    }

    return {
      queue,
      isComplete: queue.players.length + queue.botsCount >= this.getRequiredPlayersCount(gameType),
    };
  }

  async addBotToQueue(channelName: string) {
    let gameType: GameMode;
    // Проверяем в порядке от более специфичных к менее специфичным
    if (channelName.includes('2x2x2')) {
      gameType = 'TWO_VS_TWO_VS_TWO';
    } else if (channelName.includes('3x3')) {
      gameType = channelName.includes('high-mmr') ? 'THREE_VS_THREE_HIGH_MMR' : 'THREE_VS_THREE';
    } else if (channelName.includes('2x2')) {
      gameType = channelName.includes('high-mmr') ? 'TWO_VS_TWO_HIGH_MMR' : 'TWO_VS_TWO';
    } else {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Неверный тип игры',
      });
    }

    let queue = await this.prisma.queue.findFirst({
      where: {
        gameType,
        isCompleted: false,
      },
      include: {
        players: {
          include: {
            stats: true,
          },
        },
      },
    });

    if (!queue) {
      queue = await this.prisma.queue.create({
        data: {
          gameType,
          lastAdded: new Date(),
          botsCount: 1,
        },
        include: {
          players: {
            include: {
              stats: true,
            },
          },
        },
      });
    } else {
      queue = await this.prisma.queue.update({
        where: { id: queue.id },
        data: {
          lastAdded: new Date(),
          botsCount: queue.botsCount + 1,
        },
        include: {
          players: {
            include: {
              stats: true,
            },
          },
        },
      });
    }

    return {
      queue,
      isComplete: queue.players.length + queue.botsCount >= this.getRequiredPlayersCount(gameType),
    };
  }

  async removePlayerFromQueue(userId: string, channelName: string) {
    let gameType: GameMode;
    // Проверяем в порядке от более специфичных к менее специфичным
    if (channelName.includes('2x2x2')) {
      gameType = 'TWO_VS_TWO_VS_TWO';
    } else if (channelName.includes('3x3')) {
      gameType = channelName.includes('high-mmr') ? 'THREE_VS_THREE_HIGH_MMR' : 'THREE_VS_THREE';
    } else if (channelName.includes('2x2')) {
      gameType = channelName.includes('high-mmr') ? 'TWO_VS_TWO_HIGH_MMR' : 'TWO_VS_TWO';
    } else {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Неверный тип игры',
      });
    }

    let queue = await this.prisma.queue.findFirst({
      where: {
        gameType,
        isCompleted: false,
      },
      include: {
        players: {
          include: {
            stats: true,
          },
        },
      },
    });

    if (!queue) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Очередь не найдена',
      });
    }

    if (!queue.players.some((player) => player.id === userId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Вы не находитесь в очереди',
      });
    }

    queue = await this.prisma.queue.update({
      where: { id: queue.id },
      data: {
        lastAdded: new Date(),
        players: {
          disconnect: [{ id: userId }],
        },
      },
      include: {
        players: {
          include: {
            stats: true,
          },
        },
      },
    });

    if (queue.players.length === 0) {
      await this.prisma.queue.delete({
        where: { id: queue.id },
      });
      return { queue: null, isDeleted: true };
    }

    return { queue, isDeleted: false };
  }

  async removeBotFromQueue(channelName: string) {
    let gameType: GameMode;
    // Проверяем в порядке от более специфичных к менее специфичным
    if (channelName.includes('2x2x2')) {
      gameType = 'TWO_VS_TWO_VS_TWO';
    } else if (channelName.includes('3x3')) {
      gameType = channelName.includes('high-mmr') ? 'THREE_VS_THREE_HIGH_MMR' : 'THREE_VS_THREE';
    } else if (channelName.includes('2x2')) {
      gameType = channelName.includes('high-mmr') ? 'TWO_VS_TWO_HIGH_MMR' : 'TWO_VS_TWO';
    } else {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Неверный тип игры',
      });
    }

    let queue = await this.prisma.queue.findFirst({
      where: {
        gameType,
        isCompleted: false,
      },
      include: {
        players: {
          include: {
            stats: true,
          },
        },
      },
    });

    if (!queue) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Очередь не найдена',
      });
    }

    if (queue.botsCount === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'В очереди нет ботов',
      });
    }

    queue = await this.prisma.queue.update({
      where: { id: queue.id },
      data: {
        lastAdded: new Date(),
        botsCount: queue.botsCount - 1,
      },
      include: {
        players: {
          include: {
            stats: true,
          },
        },
      },
    });

    if (queue.players.length === 0) {
      await this.prisma.queue.delete({
        where: { id: queue.id },
      });
      return { queue: null, isDeleted: true };
    }

    return { queue, isDeleted: false };
  }

  async cleanOldQueues() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const oldQueues = await this.prisma.queue.findMany({
      where: {
        lastAdded: {
          lt: oneHourAgo,
        },
        isCompleted: false,
      },
      include: {
        players: {
          include: {
            stats: true,
          },
        },
      },
    });

    if (oldQueues.length > 0) {
      await this.prisma.queue.deleteMany({
        where: {
          id: {
            in: oldQueues.map((queue) => queue.id),
          },
        },
      });

      // Публикуем событие о удаленных очередях
      await publishQueueEvent(QueueEventType.QUEUE_CLEANED, oldQueues);
    }

    return oldQueues;
  }

  async cleanQueueByChannel(channelName: string) {
    let gameType: GameMode;
    // Проверяем в порядке от более специфичных к менее специфичным
    if (channelName.includes('2x2x2')) {
      gameType = 'TWO_VS_TWO_VS_TWO';
    } else if (channelName.includes('3x3')) {
      gameType = channelName.includes('high-mmr') ? 'THREE_VS_THREE_HIGH_MMR' : 'THREE_VS_THREE';
    } else if (channelName.includes('2x2')) {
      gameType = channelName.includes('high-mmr') ? 'TWO_VS_TWO_HIGH_MMR' : 'TWO_VS_TWO';
    } else {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Неверный тип игры',
      });
    }

    const queue = await this.prisma.queue.findFirst({
      where: {
        gameType,
        isCompleted: false,
      },
      include: {
        players: {
          include: {
            stats: true,
          },
        },
      },
    });

    if (!queue) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Очередь не найдена',
      });
    }

    await this.prisma.queue.delete({
      where: { id: queue.id },
    });

    return queue;
  }
}
