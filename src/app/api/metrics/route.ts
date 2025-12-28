// API endpoint для получения метрик Prometheus
import { getMetrics } from '@/lib/metrics';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const metrics = await getMetrics();
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
      },
    });
  } catch (error) {
    console.error('[Metrics] Error getting metrics:', error);
    return NextResponse.json({ error: 'Failed to get metrics' }, { status: 500 });
  }
}
