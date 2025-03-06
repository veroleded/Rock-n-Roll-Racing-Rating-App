import { authRouter } from "./routers/auth";
import { matchesRouter } from "./routers/matches";
import { queuesRouter } from './routers/queues';
import { statsRouter } from './routers/stats';
import { usersRouter } from './routers/users';
import { router } from './trpc';

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  matches: matchesRouter,
  stats: statsRouter,
  queues: queuesRouter,
});

export type AppRouter = typeof appRouter;
