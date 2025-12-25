import {
  QueueEventType,
  QueueWithPlayers,
  subscribeToQueueEvents,
} from '@/server/services/queues/queue-events';
import { Client, TextChannel } from 'discord.js';
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
      console.log(`[QueueNotificationService] Получено событие о удалении ${queues.length} очередей`);
      await this.handleCleanedQueues(queues);
    });

    console.log(`[QueueNotificationService] Инициализирован и слушает события через Redis`);
  }

  private async handleCleanedQueues(queues: QueueWithPlayers[]): Promise<void> {
    for (const queue of queues) {
      try {
        await this.sendQueueCleanedNotification(queue);
        console.log(`[QueueNotificationService] Уведомление об удалении очереди ${queue.id} отправлено в Discord`);
      } catch (error) {
        console.error(
          `[QueueNotificationService] Ошибка при отправке уведомления об очереди ${queue.id}:`,
          error
        );
      }
    }
  }

  private async sendQueueCleanedNotification(queue: QueueWithPlayers): Promise<void> {
    // Определяем название канала на основе gameType
    const channelName =
      queue.gameType === 'THREE_VS_THREE'
        ? 'сбор-на-игру-3x3'
        : queue.gameType === 'THREE_VS_THREE_HIGH_MMR'
          ? 'сбор-на-игру-3x3-high-mmr'
          : queue.gameType === 'TWO_VS_TWO_VS_TWO'
            ? 'сбор-на-игру-2x2x2'
            : queue.gameType === 'TWO_VS_TWO_HIGH_MMR'
              ? 'сбор-на-игру-2x2-high-mmr'
              : 'сбор-на-игру-2x2';

    for (const guild of this.discordClient.guilds.cache.values()) {
      // Ищем канал по названию
      const channel = guild.channels.cache.find(
        (ch) => ch.name === channelName && ch.type === 0
      );

      if (channel) {
        await (channel as TextChannel).send({
          embeds: [
            createEmbed.info(
              'Очередь удалена',
              'Очередь была автоматически удалена из-за отсутствия активности в течение часа.'
            ),
          ],
        });
        break;
      }
    }
  }
}

