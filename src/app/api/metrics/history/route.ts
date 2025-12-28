// API endpoint для получения истории метрик
import {
  getLastMetrics,
  getMetricsStats,
  readMetricsFromFile,
} from '@/server/services/metrics/metrics-logger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const stats = searchParams.get('stats') === 'true';

    // Если запрашивается статистика
    if (stats) {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      const statistics = await getMetricsStats(start, end);
      return NextResponse.json(statistics);
    }

    // Если указаны даты, читаем за период
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      const metrics = await readMetricsFromFile(start, end);
      return NextResponse.json(metrics.slice(-limit));
    }

    // Иначе возвращаем последние N записей
    const metrics = await getLastMetrics(limit);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('[MetricsHistory] Ошибка получения истории метрик:', error);
    return NextResponse.json({ error: 'Ошибка получения истории метрик' }, { status: 500 });
  }
}
