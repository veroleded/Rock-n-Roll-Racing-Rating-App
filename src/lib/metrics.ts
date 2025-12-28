// Система мониторинга трафика и метрик
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

// Создаем реестр метрик
export const register = new Registry();

// Метрики для HTTP запросов
export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const httpRequestSize = new Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  registers: [register],
});

export const httpResponseSize = new Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000],
  registers: [register],
});

// Метрики для сетевого трафика
export const networkBytesOut = new Counter({
  name: 'network_bytes_out_total',
  help: 'Total bytes sent (outbound traffic)',
  registers: [register],
});

export const networkBytesIn = new Counter({
  name: 'network_bytes_in_total',
  help: 'Total bytes received (inbound traffic)',
  registers: [register],
});

// Метрики для Redis
export const redisOperations = new Counter({
  name: 'redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

// Метрики для Discord бота
export const discordEvents = new Counter({
  name: 'discord_events_total',
  help: 'Total number of Discord events',
  labelNames: ['event_type'],
  registers: [register],
});

export const discordReconnects = new Counter({
  name: 'discord_reconnects_total',
  help: 'Total number of Discord reconnection attempts',
  registers: [register],
});

// Метрики для активных соединений
export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// Метрики для подписок Redis
export const redisSubscriptions = new Gauge({
  name: 'redis_subscriptions_active',
  help: 'Number of active Redis subscriptions',
  registers: [register],
});

// Функция для получения всех метрик в формате Prometheus
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

// Функция для очистки метрик (для тестирования)
export function clearMetrics(): void {
  register.clear();
}
