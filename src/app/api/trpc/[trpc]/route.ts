import { appRouter } from "@/server/root";
import { createTRPCContext } from "@/server/trpc";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
// Инициализируем очистку очередей при первом запросе к API
import "@/server/services/queues/queue-cleaner-init";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext(),
  });

export { handler as GET, handler as POST };
