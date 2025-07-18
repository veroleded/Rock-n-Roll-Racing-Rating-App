import { isAdminUser } from '@/lib/adminUtils';
import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

type UpdateUserData = {
  id: string;
  name?: string;
  role?: 'ADMIN' | 'MODERATOR' | 'PLAYER';
  stats?: {
    rating?: number;
    maxRating?: number;
    minRating?: number;
    totalScore?: number;
    gamesPlayed?: number;
    wins?: number;
    losses?: number;
    draws?: number;
    totalDivisions?: number;
    winsDivisions?: number;
    lossesDivisions?: number;
    drawsDivisions?: number;
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

  async create(data: { id: string; name: string; image: string }) {
    const role = isAdminUser(data.id) ? 'ADMIN' : 'PLAYER';

    let user = await this.prisma.user.findUnique({
      where: { id: data.id },
      include: { stats: true },
    });

    if (user) {
      user = await this.prisma.user.update({
        where: { id: data.id },
        data: {
          hasJoinedBot: true,
          name: data.name,
          image: data.image,
          role,
        },
        include: { stats: true },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          id: data.id,
          name: data.name,
          image: data.image,
          role,
          hasJoinedBot: true,
          stats: {
            create: {
              rating: 1100,
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
      return null;
    }

    return user;
  }

  async updateUser(data: UpdateUserData) {
    const { id, stats, ...userData } = data;

    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (existingUser?.role === 'ADMIN' && userData.role && userData.role !== 'ADMIN') {
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
              update: stats,
            }
          : undefined,
      },
      include: { stats: true },
    });

    return user;
  }

  async getTopUsers(type: 'start' | 'end') {
    const total = await this.prisma.user.count({
      where: { hasJoinedBot: true, id: { not: { startsWith: 'bot_' } } },
    });
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

    return { users, total };
  }

  async getUserWithNeighbors(userId: string) {
    const allUsers = await this.prisma.user.findMany({
      where: {
        hasJoinedBot: true,
        id: { not: { startsWith: 'bot_' } },
      },
      include: { stats: true },
      orderBy: [{ stats: { rating: 'desc' } }, { stats: { totalScore: 'desc' } }],
    });

    const usersWithRank = allUsers.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    const userIndex = usersWithRank.findIndex((user) => user.id === userId);

    if (userIndex === -1) {
      throw new Error('Пользователь не найден');
    }

    let startIndex: number;
    let endIndex: number;

    if (userIndex < 5) {
      startIndex = 0;
      endIndex = Math.min(10, allUsers.length);
    } else if (userIndex >= allUsers.length - 5) {
      endIndex = allUsers.length;
      startIndex = Math.max(0, endIndex - 10);
    } else {
      startIndex = userIndex - 5;
      endIndex = userIndex + 5;
    }

    const neighbors = usersWithRank.slice(startIndex, endIndex);

    while (neighbors.length < 10 && allUsers.length >= 10) {
      if (startIndex > 0) {
        startIndex--;
        neighbors.unshift(usersWithRank[startIndex]);
      } else if (endIndex < allUsers.length) {
        neighbors.push(usersWithRank[endIndex]);
        endIndex++;
      } else {
        break;
      }
    }

    return neighbors;
  }

  async deleteUser(id: string, currentUserId: string) {
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

    if (user.role === 'ADMIN' && id !== currentUserId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Нельзя удалить другого администратора',
      });
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true };
  }
}
