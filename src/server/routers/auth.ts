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
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  checkAdmin: protectedProcedure.query(({ ctx }) => {
    return {
      isAdmin: ctx.session.user.role === "ADMIN",
    };
  }),

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

  checkBotStatus: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        timestamp: z.string(),
        signature: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
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

      if (!verifyBotSignature(timestamp, signature, JSON.stringify(data))) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const role = isAdminUser(data.userId) ? "ADMIN" : "PLAYER";

      let user = await ctx.prisma.user.findUnique({
        where: { id: data.userId },
        include: { stats: true },
      });

      if (user) {
        user = await ctx.prisma.user.update({
          where: { id: data.userId },
          data: {
            hasJoinedBot: true,
            name: data.username,
            image: data.avatar,
            role,
          },
          include: { stats: true },
        });
      } else {
        user = await ctx.prisma.user.create({
          data: {
            id: data.userId,
            name: data.username,
            image: data.avatar,
            role,
            hasJoinedBot: true,
            stats: {
              create: {
                rating: 1800,
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

  updateUserData: publicProcedure
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

      if (!verifyBotSignature(timestamp, signature, JSON.stringify(data))) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const user = await ctx.prisma.user.update({
        where: { id: data.userId },
        data: {
          name: data.username,
          image: data.avatar,
        },
        include: { stats: true },
      });

      return user;
    }),
});
