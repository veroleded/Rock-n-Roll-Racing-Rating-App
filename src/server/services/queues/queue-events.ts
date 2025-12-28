import { Queue, Stats, User } from '@prisma/client';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { redisOperations, redisSubscriptions } from '@/lib/metrics';

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
    const redisUrl = getRedisUrl();
    console.log(`[Redis Publisher] Подключение к Redis: ${redisUrl}`);
    publisher = new Redis(redisUrl, {
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
    const redisUrl = getRedisUrl();
    console.log(`[Redis Subscriber] Подключение к Redis: ${redisUrl}`);
    subscriber = new Redis(redisUrl, {
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
    const message = JSON.stringify(queues);
    console.log(`[Redis Publisher] Публикуем событие ${eventType} для ${queues.length} очередей`);
    console.log(`[Redis Publisher] Размер сообщения: ${message.length} байт`);
    const subscribers = await pub.publish(eventType, message);
    console.log(`[Redis Publisher] Событие ${eventType} опубликовано, подписчиков: ${subscribers}`);
    redisOperations.inc({ operation: 'publish', status: 'success' });
  } catch (error) {
    console.error(`[Redis Publisher] Ошибка при публикации события ${eventType}:`, error);
    redisOperations.inc({ operation: 'publish', status: 'error' });
  }
}

// Хранилище для отслеживания подписок, чтобы избежать дублирования
const subscriptions = new Map<
  QueueEventType,
  Set<(queues: QueueWithPlayers[]) => void | Promise<void>>
>();
const isSubscribed = new Set<QueueEventType>();

// Функция для подписки на события
export function subscribeToQueueEvents(
  eventType: QueueEventType,
  callback: (queues: QueueWithPlayers[]) => void | Promise<void>
): void {
  const sub = getRedisSubscriber();

  // Инициализируем Set для callbacks, если его еще нет
  if (!subscriptions.has(eventType)) {
    subscriptions.set(eventType, new Set());
  }

  // Добавляем callback в список подписчиков
  const callbacks = subscriptions.get(eventType)!;
  if (callbacks.has(callback)) {
    console.log(`[Redis] Callback уже зарегистрирован для ${eventType}`);
    return;
  }
  callbacks.add(callback);
  console.log(`[Redis] Добавлен callback для ${eventType}`);

  // Подписываемся на канал только один раз
  if (!isSubscribed.has(eventType)) {
    isSubscribed.add(eventType);

    sub.subscribe(eventType, (err) => {
      if (err) {
        console.error(`[Redis] Ошибка при подписке на ${eventType}:`, err);
        isSubscribed.delete(eventType);
        redisOperations.inc({ operation: 'subscribe', status: 'error' });
        redisSubscriptions.dec();
      } else {
        console.log(`[Redis] Подписан на события ${eventType}`);
        redisOperations.inc({ operation: 'subscribe', status: 'success' });
        redisSubscriptions.inc();
      }
    });

    // Обработчик сообщений для этого типа события (создаем только один раз)
    sub.on('message', async (channel, message) => {
      if (channel === eventType) {
        try {
          const queues = JSON.parse(message) as QueueWithPlayers[];
          console.log(`[Redis] Получено событие ${eventType} для ${queues.length} очередей`);

          // Вызываем все зарегистрированные callbacks
          const registeredCallbacks = subscriptions.get(eventType);
          if (registeredCallbacks) {
            await Promise.all(Array.from(registeredCallbacks).map((cb) => cb(queues)));
          }
        } catch (error) {
          console.error(`[Redis] Ошибка при обработке события ${eventType}:`, error);
        }
      }
    });
  }
}
