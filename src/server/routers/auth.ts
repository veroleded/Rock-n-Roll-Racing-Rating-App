import { isAdminUser } from "@/lib/adminUtils";
import { TRPCError } from "@trpc/server";
import { createHmac } from "crypto";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../trpc";

// Функция для проверки подписи бота
function verifyBotSignature(
  timestamp: string,
  signature: string,
  body: string = ""
) {
  try {
    const hmac = createHmac("sha256", process.env.BOT_SECRET_KEY || "");
    const expectedSignature = hmac.update(`${timestamp}.${body}`).digest("hex");

    // Проверяем актуальность timestamp (5 минут)
    const timestampMs = parseInt(timestamp);
    if (isNaN(timestampMs) || Date.now() - timestampMs > 5 * 60 * 1000) {
      return false;
    }

    return signature === expectedSignature;
  } catch {
    return false;
  }
}

export const authRouter = router({
  // Получить текущий статус авторизации
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  // Проверить, является ли пользователь админом
  checkAdmin: protectedProcedure.query(({ ctx }) => {
    console.log("Session in checkAdmin:", {
      user: ctx.session.user,
      id: ctx.session.user.id,
      role: ctx.session.user.role,
    });
    return {
      isAdmin: ctx.session.user.role === "ADMIN",
    };
  }),

  // Проверить, требуется ли пользователю присоединиться к боту
  checkJoinRequired: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { hasJoinedBot: true },
    });

    return {
      joinRequired: !user?.hasJoinedBot,
    };
  }),

  // Методы для бота
  checkBotStatus: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        timestamp: z.string(),
        signature: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Проверяем подпись запроса
      if (!verifyBotSignature(input.timestamp, input.signature)) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { hasJoinedBot: true },
      });

      return { hasJoinedBot: user?.hasJoinedBot ?? false };
    }),

  joinBot: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        username: z.string(),
        avatar: z.string(),
        timestamp: z.string(),
        signature: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { timestamp, signature, ...data } = input;

      // Проверяем подпись запроса
      if (!verifyBotSignature(timestamp, signature, JSON.stringify(data))) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Определяем роль пользователя
      const role = isAdminUser(data.userId) ? "ADMIN" : "PLAYER";

      // Ищем пользователя
      let user = await ctx.prisma.user.findUnique({
        where: { id: data.userId },
        include: { stats: true },
      });

      if (user) {
        // Если пользователь существует, обновляем его
        user = await ctx.prisma.user.update({
          where: { id: data.userId },
          data: {
            hasJoinedBot: true,
            name: data.username,
            image: data.avatar,
            role, // Обновляем роль
          },
          include: { stats: true },
        });
      } else {
        // Если пользователя нет, создаем нового
        user = await ctx.prisma.user.create({
          data: {
            id: data.userId,
            name: data.username,
            image: data.avatar,
            role, // Устанавливаем роль
            hasJoinedBot: true,
            stats: {
              create: {
                rating: 1000,
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0,
              },
            },
          },
          include: { stats: true },
        });
      }

      return user;
    }),
});
