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
        code: 'NOT_FOUND',
        message: 'User not found',
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
            startsWith: 'bot_',
          },
        },
      },
      include: {
        stats: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return users;
  }

  async getBotListForMatch() {
    const bots = await this.prisma.user.findMany({
      where: { id: { startsWith: 'bot_' } },
    });

    return bots;
  }

  async getBotListForEdit() {
    const bots = await this.prisma.user.findMany({
      where: { id: { startsWith: 'bot_' } },
      include: { stats: true },
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
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }

  async updateUser(data: UpdateUserData) {
    const { id, stats, ...userData } = data;

    const existingUser = (await this.prisma.user.findUnique({
      where: { id },
      select: { role: true, stats: { select: { maxRating: true, minRating: true } } },
    })) as { role: string; stats: { maxRating: number; minRating: number } };

    const maxRating =
      existingUser?.stats?.maxRating > (stats?.rating as number)
        ? existingUser?.stats?.maxRating
        : stats?.rating;
    const minRating =
      existingUser?.stats?.minRating < (stats?.rating as number)
        ? existingUser?.stats?.minRating
        : stats?.rating;

    if (existingUser.role === 'ADMIN' && userData.role && userData.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Нельзя изменить роль администратора',
      });
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...userData,
        stats: stats
          ? {
              update: { ...stats, maxRating, minRating },
            }
          : undefined,
      },
      include: { stats: true },
    });

    return user;
  }

  async getTopUsers(type: 'start' | 'end') {
    const users = await this.prisma.user.findMany({
      where: { hasJoinedBot: true, id: { not: { startsWith: 'bot_' } } },
      include: { stats: true },
      orderBy: [
        {
          stats: {
            rating: type === 'start' ? 'desc' : 'asc',
          },
        },
        {
          stats: {
            totalScore: type === 'start' ? 'desc' : 'asc',
          },
        },
      ],
      take: 10,
    });

    return users;
  }

  async getUserWithNeighbors(userId: string) {
    // Получаем всех игроков в отсортированном порядке
    const allUsers = await this.prisma.user.findMany({
      where: {
        hasJoinedBot: true,
        id: { not: { startsWith: 'bot_' } },
      },
      include: { stats: true },
      orderBy: [{ stats: { rating: 'desc' } }, { stats: { totalScore: 'desc' } }],
    });

    // Находим индекс текущего игрока
    const userIndex = allUsers.findIndex((user) => user.id === userId);

    if (userIndex === -1) {
      throw new Error('Пользователь не найден');
    }

    // Определяем границы для выборки соседей
    let startIndex: number;
    let endIndex: number;

    if (userIndex < 5) {
      // Если игрок близко к началу списка
      startIndex = 0;
      endIndex = Math.min(10, allUsers.length);
    } else if (userIndex >= allUsers.length - 5) {
      // Если игрок близко к концу списка
      endIndex = allUsers.length;
      startIndex = Math.max(0, endIndex - 10);
    } else {
      // Игрок где-то в середине
      startIndex = userIndex - 5;
      endIndex = userIndex + 5;
    }

    // Выбираем 10 игроков
    const neighbors = allUsers.slice(startIndex, endIndex);

    // Если получилось меньше 10 (маловероятно, но на всякий случай)
    while (neighbors.length < 10 && allUsers.length >= 10) {
      if (startIndex > 0) {
        startIndex--;
        neighbors.unshift(allUsers[startIndex]);
      } else if (endIndex < allUsers.length) {
        neighbors.push(allUsers[endIndex]);
        endIndex++;
      } else {
        break; // Невозможно добавить больше игроков
      }
    }

    return neighbors;
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Пользователь не найден',
      });
    }

    if (user.role === 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Нельзя удалить администратора',
      });
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true };
  }
}
