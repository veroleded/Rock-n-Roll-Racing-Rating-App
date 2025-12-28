// Сервис для сохранения метрик в файл и базу данных
import { getMetrics } from '@/lib/metrics';
import { promises as fs } from 'fs';
import path from 'path';

const METRICS_LOG_DIR = path.join(process.cwd(), 'logs', 'metrics');
const METRICS_LOG_FILE = path.join(METRICS_LOG_DIR, 'metrics.jsonl'); // JSON Lines формат

// Интерфейс для сохранения метрик
interface MetricsSnapshot {
  timestamp: string;
  networkBytesOut: number;
  networkBytesIn: number;
  httpRequestsTotal: number;
  redisSubscriptions: number;
  discordReconnects: number;
  rawMetrics?: string; // Полные метрики в формате Prometheus
}

// Инициализация директории для логов
async function ensureLogDir(): Promise<void> {
  try {
    await fs.mkdir(METRICS_LOG_DIR, { recursive: true });
  } catch (error) {
    console.error('[MetricsLogger] Ошибка создания директории для логов:', error);
  }
}

// Парсинг метрик из Prometheus формата
function parseMetrics(metricsText: string): Partial<MetricsSnapshot> {
  const snapshot: Partial<MetricsSnapshot> = {};

  const lines = metricsText.split('\n');

  for (const line of lines) {
    // Пропускаем комментарии и пустые строки
    if (line.startsWith('#') || !line.trim()) continue;

    // Парсим network_bytes_out_total
    if (line.startsWith('network_bytes_out_total')) {
      const match = line.match(/network_bytes_out_total\s+(\d+(?:\.\d+)?)/);
      if (match) {
        snapshot.networkBytesOut = parseFloat(match[1]);
      }
    }

    // Парсим network_bytes_in_total
    if (line.startsWith('network_bytes_in_total')) {
      const match = line.match(/network_bytes_in_total\s+(\d+(?:\.\d+)?)/);
      if (match) {
        snapshot.networkBytesIn = parseFloat(match[1]);
      }
    }

    // Парсим redis_subscriptions_active
    if (line.startsWith('redis_subscriptions_active')) {
      const match = line.match(/redis_subscriptions_active\s+(\d+(?:\.\d+)?)/);
      if (match) {
        snapshot.redisSubscriptions = parseFloat(match[1]);
      }
    }

    // Парсим discord_reconnects_total
    if (line.startsWith('discord_reconnects_total')) {
      const match = line.match(/discord_reconnects_total\s+(\d+(?:\.\d+)?)/);
      if (match) {
        snapshot.discordReconnects = parseFloat(match[1]);
      }
    }

    // Подсчитываем количество HTTP запросов (все строки с http_requests_total)
    if (line.startsWith('http_requests_total')) {
      snapshot.httpRequestsTotal = (snapshot.httpRequestsTotal || 0) + 1;
    }
  }

  return snapshot;
}

// Сохранение метрик в файл (JSON Lines формат)
export async function saveMetricsToFile(): Promise<void> {
  try {
    await ensureLogDir();

    const metricsText = await getMetrics();
    const parsed = parseMetrics(metricsText);

    const snapshot: MetricsSnapshot = {
      timestamp: new Date().toISOString(),
      networkBytesOut: parsed.networkBytesOut || 0,
      networkBytesIn: parsed.networkBytesIn || 0,
      httpRequestsTotal: parsed.httpRequestsTotal || 0,
      redisSubscriptions: parsed.redisSubscriptions || 0,
      discordReconnects: parsed.discordReconnects || 0,
      rawMetrics: metricsText, // Сохраняем полные метрики для детального анализа
    };

    // Записываем в файл в формате JSON Lines (каждая строка - отдельный JSON)
    const logLine = JSON.stringify(snapshot) + '\n';
    await fs.appendFile(METRICS_LOG_FILE, logLine, 'utf-8');

    console.log(
      `[MetricsLogger] Метрики сохранены: ${snapshot.networkBytesOut} байт исходящего трафика`
    );
  } catch (error) {
    console.error('[MetricsLogger] Ошибка сохранения метрик в файл:', error);
  }
}

// Чтение метрик из файла за период
export async function readMetricsFromFile(
  startDate?: Date,
  endDate?: Date
): Promise<MetricsSnapshot[]> {
  try {
    const content = await fs.readFile(METRICS_LOG_FILE, 'utf-8');
    const lines = content
      .trim()
      .split('\n')
      .filter((line) => line.trim());

    const snapshots = lines
      .map((line) => {
        try {
          return JSON.parse(line) as MetricsSnapshot;
        } catch {
          return null;
        }
      })
      .filter((snapshot): snapshot is MetricsSnapshot => snapshot !== null);

    // Фильтруем по дате, если указана
    if (startDate || endDate) {
      return snapshots.filter((snapshot) => {
        const timestamp = new Date(snapshot.timestamp);
        if (startDate && timestamp < startDate) return false;
        if (endDate && timestamp > endDate) return false;
        return true;
      });
    }

    return snapshots;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Файл не существует - это нормально, если метрики еще не сохранялись
      return [];
    }
    console.error('[MetricsLogger] Ошибка чтения метрик из файла:', error);
    return [];
  }
}

// Получение последних N записей
export async function getLastMetrics(count: number = 10): Promise<MetricsSnapshot[]> {
  const all = await readMetricsFromFile();
  return all.slice(-count);
}

// Получение статистики за период
export async function getMetricsStats(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalBytesOut: number;
  totalBytesIn: number;
  maxBytesOut: number;
  maxBytesIn: number;
  avgBytesOut: number;
  avgBytesIn: number;
  count: number;
}> {
  const snapshots = await readMetricsFromFile(startDate, endDate);

  if (snapshots.length === 0) {
    return {
      totalBytesOut: 0,
      totalBytesIn: 0,
      maxBytesOut: 0,
      maxBytesIn: 0,
      avgBytesOut: 0,
      avgBytesIn: 0,
      count: 0,
    };
  }

  const totalBytesOut = snapshots.reduce((sum, s) => sum + s.networkBytesOut, 0);
  const totalBytesIn = snapshots.reduce((sum, s) => sum + s.networkBytesIn, 0);
  const maxBytesOut = Math.max(...snapshots.map((s) => s.networkBytesOut));
  const maxBytesIn = Math.max(...snapshots.map((s) => s.networkBytesIn));

  return {
    totalBytesOut,
    totalBytesIn,
    maxBytesOut,
    maxBytesIn,
    avgBytesOut: totalBytesOut / snapshots.length,
    avgBytesIn: totalBytesIn / snapshots.length,
    count: snapshots.length,
  };
}
