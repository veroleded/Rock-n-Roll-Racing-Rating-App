import { GameMode, Queue, Stats, User } from '@prisma/client';
import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

export type QueueWithPlayers = Queue & {
  players: (User & {
    stats: Stats | null;
  })[];
};

export enum QueueEventType {
  QUEUE_CLEANED = 'queue:cleaned',
  QUEUE_UPDATED = 'queue:updated',
}

// Создаем Redis клиенты для pub/sub
const getRedisUrl = () => {
  // Если указан REDIS_URL, используем его
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  // По умолчанию используем localhost (работает локально и в Docker через проброшенный порт)
  return 'redis://localhost:6379';
};

// Publisher для отправки событий
let publisher: Redis | null = null;

export function getRedisPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    publisher.on('error', (err) => {
      console.error('[Redis Publisher] Ошибка:', err);
    });

    publisher.on('connect', () => {
      console.log('[Redis Publisher] Подключен к Redis');
    });
  }
  return publisher;
}

// Subscriber для получения событий
let subscriber: Redis | null = null;

export function getRedisSubscriber(): Redis {
  if (!subscriber) {
    subscriber = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: null, // Для subscriber это должно быть null
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    subscriber.on('error', (err) => {
      console.error('[Redis Subscriber] Ошибка:', err);
    });

    subscriber.on('connect', () => {
      console.log('[Redis Subscriber] Подключен к Redis');
    });
  }
  return subscriber;
}

// Функция для публикации события
export async function publishQueueEvent(
  eventType: QueueEventType,
  queues: QueueWithPlayers[]
): Promise<void> {
  try {
    const pub = getRedisPublisher();
    await pub.publish(eventType, JSON.stringify(queues));
    console.log(`[Redis] Событие ${eventType} опубликовано для ${queues.length} очередей`);
  } catch (error) {
    console.error(`[Redis] Ошибка при публикации события ${eventType}:`, error);
  }
}

// Функция для подписки на события
export function subscribeToQueueEvents(
  eventType: QueueEventType,
  callback: (queues: QueueWithPlayers[]) => void | Promise<void>
): void {
  const sub = getRedisSubscriber();

  sub.subscribe(eventType, (err) => {
    if (err) {
      console.error(`[Redis] Ошибка при подписке на ${eventType}:`, err);
    } else {
      console.log(`[Redis] Подписан на события ${eventType}`);
    }
  });

  sub.on('message', async (channel, message) => {
    if (channel === eventType) {
      try {
        const queues = JSON.parse(message) as QueueWithPlayers[];
        console.log(`[Redis] Получено событие ${eventType} для ${queues.length} очередей`);
        await callback(queues);
      } catch (error) {
        console.error(`[Redis] Ошибка при обработке события ${eventType}:`, error);
      }
    }
  });
}

