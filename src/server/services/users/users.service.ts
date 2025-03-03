import { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

type UpdateUserData = {
  id: string;
  name?: string;
  role?: "ADMIN" | "MODERATOR" | "PLAYER";
  stats?: {
    rating: number;
    wins: number;
    losses: number;
    draws: number;
  };
};

export class UsersService {
  constructor(private prisma: PrismaClient) {}

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { stats: true },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }

  async getUsers() {
    const users = await this.prisma.user.findMany({
      where: {
        hasJoinedBot: true,
        NOT: {
          id: {
            startsWith: "bot_",
          },
        },
      },
      include: {
        stats: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return users;
  }

  async getBotList() {
    const bots = await this.prisma.user.findMany({
      where: { id: { startsWith: "bot_" } },
    });

    return bots;
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { stats: true },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }

  async updateUser(data: UpdateUserData) {
    const { id, stats, ...userData } = data;

    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!existingUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Пользователь не найден",
      });
    }

    if (
      existingUser.role === "ADMIN" &&
      userData.role &&
      userData.role !== "ADMIN"
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Нельзя изменить роль администратора",
      });
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...userData,
        stats: stats
          ? {
              update: stats,
            }
          : undefined,
      },
      include: { stats: true },
    });

    return user;
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Пользователь не найден",
      });
    }

    if (user.role === "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Нельзя удалить администратора",
      });
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true };
  }
}
