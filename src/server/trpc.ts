import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import type { inferAsyncReturnType } from "@trpc/server";
import { initTRPC, TRPCError } from "@trpc/server";
import { getServerSession } from "next-auth";
import superjson from "superjson";
import { ZodError } from "zod";

// Создаем контекст для каждого запроса
export async function createTRPCContext() {
  const session = await getServerSession(authOptions);

  return {
    session,
    prisma,
  };
}

export type TRPCContext = inferAsyncReturnType<typeof createTRPCContext>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Базовый middleware для проверки аутентификации
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

const isModeratorOrAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (
    ctx.session.user.role !== "ADMIN" &&
    ctx.session.user.role !== "MODERATOR"
  ) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

// Базовый middleware для проверки роли администратора
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
export const adminProcedure = t.procedure.use(isAdmin);
export const moderatorOrAdminProcedure = t.procedure.use(isModeratorOrAdmin);
