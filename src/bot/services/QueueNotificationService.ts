import {
  QueueEventType,
  QueueWithPlayers,
  subscribeToQueueEvents,
} from '@/server/services/queues/queue-events';
import { Client, TextChannel } from 'discord.js';
import { getGatheringChannelName } from '../utils/channels';
import { createEmbed } from '../utils/embeds';

export class QueueNotificationService {
  private readonly discordClient: Client;

  constructor(discordClient: Client) {
    this.discordClient = discordClient;
  }

  initialize(): void {
    console.log(`[QueueNotificationService] Подписываемся на события через Redis`);

    // Подписываемся на события через Redis pub/sub
    subscribeToQueueEvents(QueueEventType.QUEUE_CLEANED, async (queues: QueueWithPlayers[]) => {
      console.log(
        `[QueueNotificationService] Получено событие о удалении ${queues.length} очередей`
      );
      console.log(`[QueueNotificationService] Детали очередей:`, queues.map(q => ({ id: q.id, gameType: q.gameType })));
      await this.handleCleanedQueues(queues);
    });

    console.log(`[QueueNotificationService] Инициализирован и слушает события через Redis`);
  }

  private async handleCleanedQueues(queues: QueueWithPlayers[]): Promise<void> {
    if (queues.length === 0) {
      return;
    }

    // Группируем очереди по каналам, чтобы отправить одно уведомление на канал
    const queuesByChannel = new Map<string, QueueWithPlayers[]>();

    for (const queue of queues) {
      const channelName = getGatheringChannelName(queue.gameType);
      if (!queuesByChannel.has(channelName)) {
        queuesByChannel.set(channelName, []);
      }
      queuesByChannel.get(channelName)!.push(queue);
    }

    // Отправляем одно уведомление на канал
    for (const [channelName, channelQueues] of queuesByChannel.entries()) {
      try {
        await this.sendQueueCleanedNotification(channelName, channelQueues);
        console.log(
          `[QueueNotificationService] Уведомление об удалении ${channelQueues.length} очередей отправлено в канал ${channelName}`
        );
      } catch (error) {
        console.error(
          `[QueueNotificationService] Ошибка при отправке уведомления в канал ${channelName}:`,
          error
        );
      }
    }
  }

  private async sendQueueCleanedNotification(
    channelName: string,
    queues: QueueWithPlayers[]
  ): Promise<void> {
    for (const guild of this.discordClient.guilds.cache.values()) {
      // Ищем канал по названию
      const channel = guild.channels.cache.find((ch) => ch.name === channelName && ch.type === 0);

      if (channel) {
        const message =
          queues.length === 1
            ? 'Очередь была автоматически удалена из-за отсутствия активности в течение часа.'
            : `${queues.length} очередей были автоматически удалены из-за отсутствия активности в течение часа.`;

        await (channel as TextChannel).send({
          embeds: [createEmbed.info('Очередь удалена', message)],
        });
        break;
      }
    }
  }
}

