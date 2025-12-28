import { appRouter } from "@/server/root";
import { createTRPCContext } from "@/server/trpc";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
// Инициализируем очистку очередей при первом запросе к API
import {
  httpRequestCounter,
  httpRequestDuration,
  networkBytesIn,
  networkBytesOut,
} from '@/lib/metrics';
import "@/server/services/queues/queue-cleaner-init";
import "@/server/services/metrics/metrics-logger-init";

const handler = async (req: Request) => {
  const startTime = Date.now();
  const method = req.method;
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Измеряем размер запроса
  const requestSize = req.headers.get('content-length')
    ? parseInt(req.headers.get('content-length') || '0', 10)
    : 0;

  if (requestSize > 0) {
    networkBytesIn.inc(requestSize);
  }

  try {
    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: () => createTRPCContext(),
    });

    // Измеряем размер ответа
    const responseClone = response.clone();
    const responseBody = await responseClone.text();
    const responseSize = new TextEncoder().encode(responseBody).length;
    networkBytesOut.inc(responseSize);

    // Записываем метрики
    const status = response.status;
    httpRequestCounter.inc({ method, route: pathname, status: status.toString() });
    httpRequestDuration.observe(
      { method, route: pathname, status: status.toString() },
      (Date.now() - startTime) / 1000
    );

    return response;
  } catch (error) {
    // Записываем ошибку в метрики
    httpRequestCounter.inc({ method, route: pathname, status: '500' });
    httpRequestDuration.observe(
      { method, route: pathname, status: '500' },
      (Date.now() - startTime) / 1000
    );
    throw error;
  }
};

export { handler as GET, handler as POST };
