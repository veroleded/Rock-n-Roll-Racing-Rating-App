import { GameMode, PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { publishQueueEvent, QueueEventType } from './queue-events';

export class QueuesService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Проверяет, содержит ли название канала указание на high-mmr
   * Поддерживает оба формата: 'high-mmr' и 'high_mmr'
   */
  private hasHighMmr(channelName: string): boolean {
    const normalized = channelName.toLowerCase();
    return normalized.includes('high-mmr') || normalized.includes('high_mmr');
  }

  /**
   * Определяет тип игры на основе названия канала
   * @param channelName Название канала Discord
   * @returns Тип игры (GameMode)
   * @throws TRPCError если тип игры не может быть определен
   */
  private getGameTypeFromChannelName(channelName: string): GameMode {
    // Нормализуем название канала для проверки (приводим к нижнему регистру)
    const normalizedChannelName = channelName.toLowerCase();
    
    // Проверяем в порядке от более специфичных к менее специфичным
    if (normalizedChannelName.includes('2x2x2')) {
      return 'TWO_VS_TWO_VS_TWO';
    } else if (normalizedChannelName.includes('3x3')) {
      return this.hasHighMmr(normalizedChannelName) ? 'THREE_VS_THREE_HIGH_MMR' : 'THREE_VS_THREE';
    } else if (normalizedChannelName.includes('2x2')) {
      return this.hasHighMmr(normalizedChannelName) ? 'TWO_VS_TWO_HIGH_MMR' : 'TWO_VS_TWO';
    } else {
      console.error(`[QueuesService] Не удалось определить тип игры для канала: "${channelName}" (нормализованное: "${normalizedChannelName}")`);
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Неверный тип игры. Название канала: "${channelName}"`,
      });
    }
  }

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
    const gameType = this.getGameTypeFromChannelName(channelName);
    console.log(`[QueuesService] Определен тип игры: ${gameType} для канала: "${channelName}"`);

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
    const gameType = this.getGameTypeFromChannelName(channelName);

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
    const gameType = this.getGameTypeFromChannelName(channelName);

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
    const gameType = this.getGameTypeFromChannelName(channelName);

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
    const now = new Date();

    console.log(`[QueuesService] Проверка очередей старше ${oneHourAgo.toISOString()}`);
    console.log(`[QueuesService] Текущее время: ${now.toISOString()}`);
    console.log(`[QueuesService] Интервал для удаления: ${60 * 60 * 1000}ms (1 час)`);

    // Сначала получаем все невыполненные очереди для логирования
    const allQueues = await this.prisma.queue.findMany({
      where: {
        isCompleted: false,
      },
      select: {
        id: true,
        gameType: true,
        lastAdded: true,
        players: {
          select: {
            id: true,
          },
        },
      },
    });

    console.log(`[QueuesService] Всего невыполненных очередей: ${allQueues.length}`);
    allQueues.forEach((q) => {
      const age = now.getTime() - q.lastAdded.getTime();
      const ageMinutes = Math.floor(age / 1000 / 60);
      console.log(
        `[QueuesService] Очередь ${q.id} (${q.gameType}): lastAdded=${q.lastAdded.toISOString()}, возраст=${ageMinutes} минут, игроков=${q.players.length}`
      );
    });

    // Используем более точное сравнение: очереди должны быть старше 1 часа
    // Добавляем небольшую задержку (1 секунда) для избежания проблем с точностью времени
    const oneHourAgoWithMargin = new Date(oneHourAgo.getTime() - 1000);

    const oldQueues = await this.prisma.queue.findMany({
      where: {
        lastAdded: {
          lt: oneHourAgoWithMargin,
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

    console.log(`[QueuesService] Найдено ${oldQueues.length} старых очередей для удаления`);

    if (oldQueues.length > 0) {
      oldQueues.forEach((q) => {
        const age = now.getTime() - q.lastAdded.getTime();
        const ageMinutes = Math.floor(age / 1000 / 60);
        const ageSeconds = Math.floor(age / 1000);
        console.log(
          `[QueuesService] УДАЛЯЕМ очередь ${q.id} (${q.gameType}): lastAdded=${q.lastAdded.toISOString()}, возраст=${ageSeconds} секунд (${ageMinutes} минут), игроков=${q.players.length}, oneHourAgo=${oneHourAgo.toISOString()}`
        );
      });
      console.log(`[QueuesService] Удаление ${oldQueues.length} старых очередей`);
      await this.prisma.queue.deleteMany({
        where: {
          id: {
            in: oldQueues.map((queue) => queue.id),
          },
        },
      });

      // Публикуем событие о удаленных очередях
      console.log(
        `[QueuesService] Публикация события QUEUE_CLEANED для ${oldQueues.length} очередей`
      );
      await publishQueueEvent(QueueEventType.QUEUE_CLEANED, oldQueues);
      console.log(`[QueuesService] Событие опубликовано`);
    }

    return oldQueues;
  }

  async cleanQueueByChannel(channelName: string) {
    const gameType = this.getGameTypeFromChannelName(channelName);

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
