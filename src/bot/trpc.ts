import type { AppRouter } from '@/server/root';
import { PrismaClient } from '@prisma/client';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

const APP_URL =
  process.env.NODE_ENV === 'production' ? (process.env.APP_URL ?? '') : 'http://localhost:3000';

// Создаем клиент tRPC
export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${APP_URL}/api/trpc`,
    }),
  ],
  transformer: superjson,
});

export const prisma = new PrismaClient();
