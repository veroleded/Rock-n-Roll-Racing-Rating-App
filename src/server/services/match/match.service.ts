import {
  GameMode,
  Match,
  MatchPlayer,
  PrismaClient,
  User,
} from "@prisma/client";
import { CreateMatchData, MatchResultData, StatsData } from "./schemas";

type MatchWithRelations = Match & {
  players: (MatchPlayer & {
    user: User;
  })[];
  creator: User;
};

interface FindManyResult {
  matches: MatchWithRelations[];
  total: number;
}

export class MatchService {
  constructor(private prisma: PrismaClient) {}

  private calculateResult(
    mode: GameMode,
    team: number,
    scores: number[],
    isRated: boolean
  ): MatchResultData {
    let result: "WIN" | "LOSS" | "DRAW";
    let ratingChange = 0;

    if (mode === "TWO_VS_TWO_VS_TWO") {
      const teamScores = [scores[0], scores[1], scores[2]];
      const playerTeamScore = teamScores[team - 1];
      const maxScore = Math.max(...teamScores);

      if (playerTeamScore === maxScore) {
        const winners = teamScores.filter((score) => score === maxScore).length;
        result = winners > 1 ? "DRAW" : "WIN";
        ratingChange = winners > 1 ? 0 : 1;
      } else {
        result = "LOSS";
        ratingChange = -1;
      }
    } else {
      const [team1Score, team2Score] = scores;
      if (team1Score === team2Score) {
        result = "DRAW";
        ratingChange = 0;
      } else if (
        (team === 1 && team1Score > team2Score) ||
        (team === 2 && team2Score > team1Score)
      ) {
        result = "WIN";
        ratingChange = 1;
      } else {
        result = "LOSS";
        ratingChange = -1;
      }
    }

    return {
      result,
      ratingChange: isRated ? ratingChange : 0,
    };
  }

  private getPlayerStats(statsData: StatsData, position: number) {
    const playerKey = `player${position}`;

    return {
      score: statsData.scores[playerKey] || 0,
      damage: Object.values(statsData.damage[playerKey] || {}).reduce(
        (a, b) => a + b,
        0
      ),
      damageDealt: statsData.damage[playerKey] || {},
      minesDamage: statsData.mines_damage[playerKey] || 0,
      moneyTaken: statsData.money_taken[playerKey] || 0,
      armorTaken: statsData.armor_taken[playerKey] || 0,
      wipeouts: statsData.wipeouts[playerKey] || 0,
      divisions: Object.entries(statsData.divisions).reduce(
        (acc, [key, value]) => {
          acc[key] = value[playerKey] || 0;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }

  private parseScores(totalScore: string): number[] {
    return totalScore.split(" - ").map(Number);
  }

  async create(data: CreateMatchData) {
    const hasBots = data.players.some((player) =>
      player.userId.startsWith("bot_")
    );
    const isRated = !hasBots && data.mode !== "TWO_VS_TWO_VS_TWO";
    const scores = this.parseScores(data.statsData.total_score);

    const bots = data.players.filter((player) =>
      player.userId.startsWith("bot_")
    );
    if (bots.length > 0) {
      await Promise.all(
        bots.map(async (bot) => {
          const existingBot = await this.prisma.user.findUnique({
            where: { id: bot.userId },
          });

          if (!existingBot) {
            await this.prisma.user.create({
              data: {
                id: bot.userId,
                name: bot.userId.replace("bot_", ""),
                role: "PLAYER",
              },
            });
          }
        })
      );
    }

    const realPlayers = data.players.filter(
      (player) => !player.userId.startsWith("bot_")
    );
    await Promise.all(
      realPlayers.map(async (player) => {
        const stats = await this.prisma.stats.findUnique({
          where: { userId: player.userId },
        });

        if (!stats) {
          await this.prisma.stats.create({
            data: {
              userId: player.userId,
              rating: 1000,
              gamesPlayed: 0,
              wins: 0,
              losses: 0,
              draws: 0,
            },
          });
        }
      })
    );

    try {
      const match = await this.prisma.match.create({
        data: {
          mode: data.mode,
          creatorId: data.creatorId,
          isRated,
          totalScore: data.statsData.total_score,
          players: {
            create: data.players.map((player) => {
              const stats = this.getPlayerStats(
                data.statsData,
                player.position
              );
              const { result, ratingChange } = this.calculateResult(
                data.mode,
                player.team,
                scores,
                isRated
              );

              return {
                userId: player.userId,
                team: player.team,
                position: player.position,
                hasLeft: player.hasLeft,
                ...stats,
                result,
                ratingChange: player.userId.startsWith("bot_")
                  ? 0
                  : ratingChange,
              };
            }),
          },
        },
        include: {
          players: {
            include: {
              user: true,
            },
          },
          creator: true,
        },
      });

      await Promise.all(
        match.players
          .filter((player) => !player.userId.startsWith("bot_"))
          .map((player) =>
            this.prisma.stats.update({
              where: { userId: player.userId },
              data: {
                gamesPlayed: { increment: 1 },
                rating: { increment: player.ratingChange },
                wins: player.result === "WIN" ? { increment: 1 } : undefined,
                losses: player.result === "LOSS" ? { increment: 1 } : undefined,
                draws: player.result === "DRAW" ? { increment: 1 } : undefined,
              },
            })
          )
      );

      return match;
    } catch (error) {
      throw error;
    }
  }

  async findById(id: string) {
    return this.prisma.match.findUnique({
      where: { id },
      include: {
        players: {
          include: {
            user: true,
          },
        },
        creator: true,
      },
    });
  }

  async findMany(options: {
    limit?: number;
    offset?: number;
    filters?: {
      userId?: string;
      onlyRated?: boolean;
      gameMode?: GameMode;
    };
  }): Promise<FindManyResult> {
    const { limit = 50, offset = 0, filters } = options;

    const where = {
      AND: [
        filters?.userId
          ? {
              players: {
                some: {
                  userId: filters.userId,
                },
              },
            }
          : {},
        filters?.onlyRated ? { isRated: true } : {},
        filters?.gameMode ? { mode: filters.gameMode } : {},
      ],
    };

    const [total, matches] = await Promise.all([
      this.prisma.match.count({ where }),
      this.prisma.match.findMany({
        take: limit,
        skip: offset,
        where,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          players: {
            include: {
              user: true,
            },
          },
          creator: true,
        },
      }),
    ]);

    return {
      matches,
      total,
    };
  }

  async delete(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        players: true,
      },
    });

    if (!match) {
      return null;
    }

    await Promise.all(
      match.players
        .filter((player) => !player.userId.startsWith("bot_"))
        .map((player) =>
          this.prisma.stats.update({
            where: { userId: player.userId },
            data: {
              gamesPlayed: { decrement: 1 },
              rating: { decrement: player.ratingChange },
              wins: player.result === "WIN" ? { decrement: 1 } : undefined,
              losses: player.result === "LOSS" ? { decrement: 1 } : undefined,
              draws: player.result === "DRAW" ? { decrement: 1 } : undefined,
            },
          })
        )
    );

    return this.prisma.match.delete({
      where: { id },
      include: {
        players: {
          include: {
            user: true,
          },
        },
        creator: true,
      },
    });
  }
}
