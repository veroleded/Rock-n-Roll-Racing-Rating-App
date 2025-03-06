import { GameMode, PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

export class QueuesService {
  constructor(private prisma: PrismaClient) {}

  private getRequiredPlayersCount(gameType: GameMode): number {
    switch (gameType) {
      case 'THREE_VS_THREE':
        return 6;
      case 'TWO_VS_TWO':
        return 4;
      case 'TWO_VS_TWO_VS_TWO':
        return 6;
    }
  }

  async addPlayerToQueue(userId: string, channelName: string) {
    // Определяем тип игры на основе названия канала
    let gameType: GameMode;
    if (channelName.includes('3x3')) {
      gameType = 'THREE_VS_THREE';
    } else if (channelName.includes('2x2x2')) {
      gameType = 'TWO_VS_TWO_VS_TWO';
    } else if (channelName.includes('2x2')) {
      gameType = 'TWO_VS_TWO';
    } else {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Неверный тип игры',
      });
    }

    // Проверяем существующую очередь или создаем новую
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

    // Проверяем, не находится ли игрок уже в очереди
    if (queue?.players.some((player) => player.id === userId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Вы уже находитесь в очереди',
      });
    }

    // Если очереди нет, создаем новую
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
      // Добавляем игрока в существующую очередь
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
    // Определяем тип игры на основе названия канала
    let gameType: GameMode;
    if (channelName.includes('3x3')) {
      gameType = 'THREE_VS_THREE';
    } else if (channelName.includes('2x2x2')) {
      gameType = 'TWO_VS_TWO_VS_TWO';
    } else if (channelName.includes('2x2')) {
      gameType = 'TWO_VS_TWO';
    } else {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Неверный тип игры',
      });
    }

    // Проверяем существующую очередь или создаем новую
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

    // Если очереди нет, создаем новую
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
      // Увеличиваем счетчик ботов
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
    // Определяем тип игры на основе названия канала
    let gameType: GameMode;
    if (channelName.includes('3x3')) {
      gameType = 'THREE_VS_THREE';
    } else if (channelName.includes('2x2x2')) {
      gameType = 'TWO_VS_TWO_VS_TWO';
    } else if (channelName.includes('2x2')) {
      gameType = 'TWO_VS_TWO';
    } else {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Неверный тип игры',
      });
    }

    // Находим очередь
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

    // Проверяем, находится ли игрок в очереди
    if (!queue.players.some((player) => player.id === userId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Вы не находитесь в очереди',
      });
    }

    // Удаляем игрока из очереди
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

    // Если в очереди не осталось игроков и нет ботов, удаляем её
    if (queue.players.length === 0) {
      await this.prisma.queue.delete({
        where: { id: queue.id },
      });
      return { queue: null, isDeleted: true };
    }

    return { queue, isDeleted: false };
  }

  async removeBotFromQueue(channelName: string) {
    // Определяем тип игры на основе названия канала
    let gameType: GameMode;
    if (channelName.includes('3x3')) {
      gameType = 'THREE_VS_THREE';
    } else if (channelName.includes('2x2x2')) {
      gameType = 'TWO_VS_TWO_VS_TWO';
    } else if (channelName.includes('2x2')) {
      gameType = 'TWO_VS_TWO';
    } else {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Неверный тип игры',
      });
    }

    // Находим очередь
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

    // Проверяем, есть ли боты в очереди
    if (queue.botsCount === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'В очереди нет ботов',
      });
    }

    // Уменьшаем количество ботов
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

    // Если в очереди не осталось игроков
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
    }

    return oldQueues;
  }

  async cleanQueueByChannel(channelName: string) {
    // Определяем тип игры на основе названия канала
    let gameType: GameMode;
    if (channelName.includes('3x3')) {
      gameType = 'THREE_VS_THREE';
    } else if (channelName.includes('2x2x2')) {
      gameType = 'TWO_VS_TWO_VS_TWO';
    } else if (channelName.includes('2x2')) {
      gameType = 'TWO_VS_TWO';
    } else {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Неверный тип игры',
      });
    }

    // Находим очередь
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

    // Удаляем очередь
    await this.prisma.queue.delete({
      where: { id: queue.id },
    });

    return queue;
  }
}
