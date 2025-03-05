import { getInverseCommonValue, getPercentage } from '@/lib/math';
import { Divisions } from '@/types/json-types';
import {
  GameMode,
  Match,
  MatchPlayer,
  MatchResult,
  PrismaClient,
  Stats,
  User,
} from '@prisma/client';
import {
  CreateMatchData,
  CreateMatchPlayer,
  CreateStatsData,
  Damages,
  EditMatchDataSchema,
  NormalizedDivisionData,
  NormalizedStatsData,
} from './schemas';

// Локальное определение типа StatsData

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

  private normalizeStatsData(
    statsData: CreateStatsData,
    players: CreateMatchPlayer[]
  ): NormalizedStatsData {
    type PlayerKey = keyof typeof statsData.damage;

    const playerToIdMap = new Map<PlayerKey, string>();
    const playerToTeamMap = new Map<string, number>();

    players.forEach((player) => {
      const playerKey = `player${player.position}` as PlayerKey;
      playerToIdMap.set(playerKey, player.userId);
      playerToTeamMap.set(playerKey, player.team);
    });

    const normalizedStatsData: NormalizedStatsData = {
      damage: {},
      scores: {},
      mines_damage: {},
      money_taken: {},
      armor_taken: {},
      wipeouts: {},
      divisions: {},
      total_score: statsData.total_score,
    };

    Object.entries(statsData.damage).forEach(([attacker, victims]) => {
      const attackerId = playerToIdMap.get(attacker as PlayerKey) as string;
      normalizedStatsData.damage[attackerId] = {};

      Object.entries(victims || {}).forEach(([victim, damageValue]) => {
        const victimId = playerToIdMap.get(victim as PlayerKey) as string;
        normalizedStatsData.damage[attackerId][victimId] = damageValue;
      });
    });

    const singleLevelFields = [
      'scores',
      'mines_damage',
      'money_taken',
      'armor_taken',
      'wipeouts',
    ] as const;
    singleLevelFields.forEach((field) => {
      Object.entries(statsData[field] || {}).forEach(([playerKey, value]) => {
        const playerId = playerToIdMap.get(playerKey as PlayerKey) as string;
        normalizedStatsData[field][playerId] = value;
      });
    });

    if (statsData.divisions) {
      for (const [divisionName, playerScores] of Object.entries(statsData.divisions)) {
        normalizedStatsData.divisions[divisionName] = {};

        const teamScores: Record<number, number> = {};

        for (const [playerKey, scoreValue] of Object.entries(playerScores)) {
          const playerTeam = playerToTeamMap.get(playerKey) || 0;
          if (!teamScores[playerTeam]) {
            teamScores[playerTeam] = 0;
          }
          teamScores[playerTeam] += Number(scoreValue);
        }

        const teamScoreValues = Object.values(teamScores);
        const maxScore = teamScoreValues.length > 0 ? Math.max(...teamScoreValues) : 0;

        let teamsWithMaxScore = 0;
        for (const score of teamScoreValues) {
          if (score === maxScore) {
            teamsWithMaxScore++;
          }
        }

        for (const [playerKey, scoreValue] of Object.entries(playerScores)) {
          const userId = playerToIdMap.get(playerKey as PlayerKey) || playerKey;
          const team = playerToTeamMap.get(playerKey) || 0;
          const teamScore = teamScores[team] || 0;
          const score = Number(scoreValue);

          let result: MatchResult;
          if (teamScore === maxScore) {
            result = teamsWithMaxScore > 1 ? 'DRAW' : 'WIN';
          } else {
            result = 'LOSS';
          }

          normalizedStatsData.divisions[divisionName][userId] = {
            result,
            scores: score,
          };
        }
      }
    }
    return normalizedStatsData;
  }

  private calculatePlayerDamage(
    userId: string,
    normalizedDamage: Record<string, Record<string, number>>,
    players: CreateMatchPlayer[]
  ) {
    const playerTeams = new Map<string, number>();
    players.forEach((player) => {
      playerTeams.set(player.userId, player.team);
    });

    const playerTeam = playerTeams.get(userId);

    const damageDealt: Damages = {};
    const damageReceived: Damages = {};
    let totalDamageDealt = 0;
    let totalDamageReceived = 0;

    if (normalizedDamage[userId]) {
      Object.entries(normalizedDamage[userId]).forEach(([targetId, damageAmount]) => {
        const targetTeam = playerTeams.get(targetId);
        const isAlly = playerTeam === targetTeam;

        damageDealt[targetId] = {
          isAlly,
          damage: damageAmount,
        };

        totalDamageDealt += damageAmount;
      });
    }

    Object.entries(normalizedDamage).forEach(([attackerId, targets]) => {
      if (attackerId !== userId && targets[userId]) {
        const attackerTeam = playerTeams.get(attackerId);
        const isAlly = attackerTeam === playerTeam;

        damageReceived[attackerId] = {
          isAlly,
          damage: targets[userId],
        };

        totalDamageReceived += targets[userId];
      }
    });

    return {
      totalDamageDealt,
      totalDamageReceived,
      damageDealt,
      damageReceived,
    };
  }

  private calculateTeamResultDivisions(
    divisions: NormalizedDivisionData,
    players: CreateMatchPlayer[]
  ) {
    // Сначала собираем информацию о очках пользователей по дивизиям и командам
    const teamsScores = Object.entries(divisions).reduce(
      (acc, [divisionName, playersResult]) => {
        players.forEach((player) => {
          if (!acc[divisionName]) {
            acc[divisionName] = {};
          }
          if (!acc[divisionName][player.team]) {
            acc[divisionName][player.team] = { scoresSum: 0, userScores: {} };
          }
          const playerScore = playersResult[player.userId].scores;
          acc[divisionName][player.team].scoresSum += playerScore;
          acc[divisionName][player.team].userScores[player.userId] = playerScore;
        });
        return acc;
      },
      {} as Record<
        string,
        Record<number, { scoresSum: number; userScores: Record<string, number> }>
      >
    );

    // Теперь определяем результаты для каждой команды
    const teamsResult = Object.entries(teamsScores).reduce(
      (acc, [divisionName, teams]) => {
        const maxScore = Math.max(...Object.values(teams).map((team) => team.scoresSum));
        const isDraw =
          Object.values(teams).filter((team) => team.scoresSum === maxScore).length ===
          Object.values(teams).length;

        const divisionTeamsResult = Object.entries(teams).reduce(
          (teamAcc, [teamStr, teamData]) => {
            const team = Number(teamStr);
            if (isDraw) {
              teamAcc[team] = {
                scoresSum: teamData.scoresSum,
                result: 'DRAW',
                points: 1,
                userScores: teamData.userScores,
              };
            } else if (teamData.scoresSum === maxScore) {
              teamAcc[team] = {
                scoresSum: teamData.scoresSum,
                result: 'WIN',
                points: 2,
                userScores: teamData.userScores,
              };
            } else {
              teamAcc[team] = {
                scoresSum: teamData.scoresSum,
                result: 'LOSS',
                points: 0,
                userScores: teamData.userScores,
              };
            }
            return teamAcc;
          },
          {} as Record<
            number,
            {
              scoresSum: number;
              result: MatchResult;
              points: 0 | 1 | 2;
              userScores: Record<string, number>;
            }
          >
        );

        acc[divisionName] = divisionTeamsResult;
        return acc;
      },
      {} as Record<
        string,
        Record<
          number,
          {
            scoresSum: number;
            result: MatchResult;
            points: 0 | 1 | 2;
            userScores: Record<string, number>;
          }
        >
      >
    );

    return teamsResult;
  }

  private isRated(mode: GameMode, players: CreateMatchPlayer[]) {
    const realPlayers = players.filter((player) => !player.userId.startsWith('bot_'));
    if (mode === 'TWO_VS_TWO_VS_TWO' || realPlayers.length !== players.length) {
      return false;
    } else {
      return true;
    }
  }

  private calculateTotalPoints(
    divisions: Record<
      string,
      Record<
        number,
        {
          scoresSum: number;
          result: MatchResult;
          points: 0 | 1 | 2;
          userScores: Record<string, number>;
        }
      >
    >
  ) {
    const totalPoints = Object.entries(divisions).reduce(
      (acc, [, teams]) => {
        Object.entries(teams).forEach(([team, data]) => {
          if (!acc[team]) {
            acc[team] = 0;
          }
          acc[team] += data.points;
        });
        return acc;
      },
      {} as Record<string, number>
    );

    const maxPoints = Math.max(...Object.values(totalPoints));
    const isDraw =
      Object.values(totalPoints).filter((points) => points === maxPoints).length ===
      Object.values(totalPoints).length;
    const totalResult = Object.entries(totalPoints).reduce(
      (acc, [team, points]) => {
        if (isDraw) {
          acc[team] = {
            points,
            result: 'DRAW',
          };
        } else if (points === maxPoints) {
          acc[team] = {
            points,
            result: 'WIN',
          };
        } else {
          acc[team] = {
            points,
            result: 'LOSS',
          };
        }
        return acc;
      },
      {} as Record<string, { points: number; result: MatchResult }>
    );

    return totalResult;
  }

  private getELOcoefficient(rating1: number, rating2: number, result1: 1 | 0 | 0.5) {
    const K = 100;
    const result2 = 1 - result1;
    const E1 = (1 / (1 + 10 * ((rating2 - rating1) / 400))).toFixed(3);
    const E2 = (1 / (1 + 10 * ((rating1 - rating2) / 400))).toFixed(3);
    const eloCoef1 = K * (result1 - Number(E1));
    const eloCoef2 = K * (result2 - Number(E2));
    return { eloCoef1, eloCoef2 };
  }

  private getDivCoefficient(totalPoints: string) {
    const [team1, team2] = totalPoints.split(' - ');

    const OKO = (Number(team1) + Number(team2)) / 2;
    const P = Math.abs(Number(team1) - Number(team2));
    let divCoef1 = 0;
    let divCoef2 = 0;

    if (P <= OKO) {
      divCoef1 = P * 3;
      divCoef2 = P * 3;
    } else {
      divCoef1 = OKO * 3 + (P - OKO) * 1.5;
      divCoef2 = OKO * 3 + (P - OKO) * 1.5;
    }

    if (team1 > team2) {
      divCoef2 = -divCoef2;
    } else if (team1 < team2) {
      divCoef1 = -divCoef1;
    } else {
      divCoef1 = 0;
      divCoef2 = 0;
    }

    return { divCoef1, divCoef2 };
  }

  private getScoreCoefficient(score1: number, score2: number) {
    const scoreCoef1 = (score1 - score2) / 1000;
    const scoreCoef2 = (score2 - score1) / 1000;
    return { scoreCoef1, scoreCoef2 };
  }

  private getBaseCoefficient(
    divCoefs: { divCoef1: number; divCoef2: number },
    scoreCoefs: { scoreCoef1: number; scoreCoef2: number },
    eloCoefs: { eloCoef1: number; eloCoef2: number }
  ) {
    const baseCoef1 =
      eloCoefs.eloCoef1 +
      (getPercentage(eloCoefs.eloCoef1, divCoefs.divCoef1) +
        getPercentage(eloCoefs.eloCoef1, scoreCoefs.scoreCoef1));
    const baseCoef2 =
      eloCoefs.eloCoef2 +
      (getPercentage(eloCoefs.eloCoef2, divCoefs.divCoef2) +
        getPercentage(eloCoefs.eloCoef2, scoreCoefs.scoreCoef2));
    return { baseCoef1: Number(baseCoef1.toFixed(3)), baseCoef2: Number(baseCoef2.toFixed(3)) };
  }

  private async getRatingChange(
    baseCoefs: { baseCoef1: number; baseCoef2: number },
    players: CreateMatchPlayer[],
    totalScore: string
  ) {
    const [resultTeam1, resultTeam2] = totalScore.split(' - ');
    const playersInBase = await this.prisma.stats.findMany({
      where: {
        userId: { in: players.map((player) => player.userId) },
      },
    });

    const { team1Scores, team2Scores } = players.reduce(
      (acc, player) => {
        const playerInBase = playersInBase.find((p) => p.userId === player.userId);
        if (playerInBase) {
          if (player.team === 1) {
            acc.team1Scores.rating += playerInBase.rating;
            acc.team1Scores.users[player.userId] = playerInBase.rating;
          } else {
            acc.team2Scores.rating += playerInBase.rating;
            acc.team2Scores.users[player.userId] = playerInBase.rating;
          }
        }
        return acc;
      },
      { team1Scores: { rating: 0, users: {} }, team2Scores: { rating: 0, users: {} } } as {
        team1Scores: { rating: number; users: Record<string, number> };
        team2Scores: { rating: number; users: Record<string, number> };
      }
    );

    const usersRatingChange: Record<string, number> = {};

    if (resultTeam1 > resultTeam2) {
      const R1 = getInverseCommonValue(...Object.values(team1Scores.users).map((value) => value));
      const R2 = team2Scores.rating;
      Object.entries(team1Scores.users).forEach(([key, value]) => {
        usersRatingChange[key] = Number((1 / value / R1).toFixed(3));
      });
      Object.entries(team2Scores.users).forEach(([key, value]) => {
        usersRatingChange[key] = Number((value / R2).toFixed(3));
      });
    } else if (resultTeam2 > resultTeam1) {
      const R1 = team1Scores.rating;
      const R2 = getInverseCommonValue(...Object.values(team2Scores.users).map((value) => value));
      Object.entries(team2Scores.users).forEach(([key, value]) => {
        usersRatingChange[key] = Number((1 / value / R1).toFixed(3));
      });
      Object.entries(team1Scores.users).forEach(([key, value]) => {
        usersRatingChange[key] = Number((value / R2).toFixed(3));
      });
    }

    playersInBase.reduce((acc, player) => {}, {});
  }
  async create(data: CreateMatchData) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const normalizedStatsData = this.normalizeStatsData(data.statsData, data.players);
        const teamsResult = this.calculateTeamResultDivisions(
          normalizedStatsData.divisions,
          data.players
        );

        const totalPoints = this.calculateTotalPoints(teamsResult);

        const totalScore = Object.values(totalPoints)
          .map((team) => team.points)
          .join(' - ');

        const isRated = this.isRated(data.mode, data.players);
        console.log(totalScore);
        const matchPlayers = data.players.map((player) => {
          const { userId } = player;
          const damages = this.calculatePlayerDamage(
            player.userId,
            normalizedStatsData.damage,
            data.players
          );
          const score = normalizedStatsData.scores[userId];
          const minesDamage = normalizedStatsData.mines_damage[userId];
          const moneyTaken = normalizedStatsData.money_taken[userId];
          const armorTaken = normalizedStatsData.armor_taken[userId];
          const wipeouts = normalizedStatsData.wipeouts[userId];
          const result = totalPoints[player.team.toString()].result;

          const ratingChange = isRated ? (result === 'WIN' ? 10 : result === 'LOSS' ? -10 : 0) : 0;

          const divisions = Object.entries(normalizedStatsData.divisions).reduce(
            (acc, [key, value]) => {
              if (value[userId]) {
                acc[key] = value[userId];
              }
              return acc;
            },
            {} as Record<string, { scores: number; result: MatchResult }>
          );

          return {
            ...player,
            ...damages,
            score,
            minesDamage,
            moneyTaken,
            armorTaken,
            wipeouts,
            divisions,
            result,
            ratingChange,
          };
        });

        const match = await tx.match.create({
          data: {
            mode: data.mode,
            creatorId: data.creatorId,
            isRated,
            totalScore,
            players: {
              create: matchPlayers,
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
            .filter((player) => !player.userId.startsWith('bot_'))
            .map(async (player) => {
              const stats = (await tx.stats.findUnique({
                where: { userId: player.userId },
              })) as Stats;
              return tx.stats.update({
                where: { userId: player.userId },
                data: {
                  gamesPlayed: { increment: 1 },
                  rating: { increment: player.ratingChange },
                  wins: player.result === 'WIN' ? { increment: 1 } : undefined,
                  losses: player.result === 'LOSS' ? { increment: 1 } : undefined,
                  draws: player.result === 'DRAW' ? { increment: 1 } : undefined,
                  totalScore: { increment: player.score },
                  totalDivisions: { increment: Object.keys(player.divisions as Divisions).length },
                  maxRating: {
                    set:
                      player.ratingChange > 0
                        ? Math.max(stats.rating + player.ratingChange, stats.maxRating)
                        : stats.maxRating,
                  },
                  minRating: {
                    set:
                      player.ratingChange < 0
                        ? Math.min(stats.rating + player.ratingChange, stats.minRating)
                        : stats.minRating,
                  },
                  winsDivisions: {
                    increment: Object.values(player.divisions as Divisions).filter(
                      (division) => division.result === 'WIN'
                    ).length,
                  },
                  lossesDivisions: {
                    increment: Object.values(player.divisions as Divisions).filter(
                      (division) => division.result === 'LOSS'
                    ).length,
                  },
                  drawsDivisions: {
                    increment: Object.values(player.divisions as Divisions).filter(
                      (division) => division.result === 'DRAW'
                    ).length,
                  },
                },
              });
            })
        );

        return match;
      });
    } catch (error) {
      console.error('Error create match.service', error);
      throw error;
    }
  }

  async edit(editData: EditMatchDataSchema) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const { editMatchId, ...matchData } = editData;

        // Получаем матч для удаления
        const matchToDelete = await tx.match.findUnique({
          where: { id: editMatchId },
          include: {
            players: true,
          },
        });

        if (!matchToDelete) {
          throw new Error(`Match with id ${editMatchId} not found`);
        }

        // Сохраняем дату создания для последующего использования
        const originalCreatedAt = matchToDelete.createdAt;

        // Удаляем старый матч
        await Promise.all(
          matchToDelete.players
            .filter((player) => !player.userId.startsWith('bot_'))
            .map(async (player) => {
              const stats = (await tx.stats.findUnique({
                where: { userId: player.userId },
              })) as Stats;
              return tx.stats.update({
                where: { userId: player.userId },
                data: {
                  gamesPlayed: { decrement: 1 },
                  rating: { decrement: player.ratingChange },
                  wins: player.result === 'WIN' ? { decrement: 1 } : undefined,
                  losses: player.result === 'LOSS' ? { decrement: 1 } : undefined,
                  draws: player.result === 'DRAW' ? { decrement: 1 } : undefined,
                  totalScore: { decrement: player.score },
                  totalDivisions: { decrement: Object.keys(player.divisions as Divisions).length },
                  winsDivisions: {
                    decrement: Object.values(player.divisions as Divisions).filter(
                      (division) => division.result === 'WIN'
                    ).length,
                  },
                  lossesDivisions: {
                    decrement: Object.values(player.divisions as Divisions).filter(
                      (division) => division.result === 'LOSS'
                    ).length,
                  },
                  drawsDivisions: {
                    decrement: Object.values(player.divisions as Divisions).filter(
                      (division) => division.result === 'DRAW'
                    ).length,
                  },
                  maxRating: {
                    set:
                      player.ratingChange > 0 && stats.maxRating === stats.rating
                        ? stats.maxRating - player.ratingChange
                        : stats.maxRating,
                  },
                  minRating: {
                    set:
                      player.ratingChange < 0 && stats.minRating === stats.rating
                        ? stats.minRating - player.ratingChange
                        : stats.minRating,
                  },
                },
              });
            })
        );

        await tx.matchPlayer.deleteMany({
          where: { matchId: editMatchId },
        });

        await tx.match.delete({
          where: { id: editMatchId },
        });

        // Создаем новый матч
        const normalizedStatsData = this.normalizeStatsData(matchData.statsData, matchData.players);
        const teamsResult = this.calculateTeamResultDivisions(
          normalizedStatsData.divisions,
          matchData.players
        );

        const totalPoints = this.calculateTotalPoints(teamsResult);

        const totalScore = Object.values(totalPoints)
          .map((team) => team.points)
          .join(' - ');

        const isRated = this.isRated(matchData.mode, matchData.players);

        const matchPlayers = matchData.players.map((player) => {
          const { userId } = player;
          const damages = this.calculatePlayerDamage(
            player.userId,
            normalizedStatsData.damage,
            matchData.players
          );
          const score = normalizedStatsData.scores[userId];
          const minesDamage = normalizedStatsData.mines_damage[userId];
          const moneyTaken = normalizedStatsData.money_taken[userId];
          const armorTaken = normalizedStatsData.armor_taken[userId];
          const wipeouts = normalizedStatsData.wipeouts[userId];
          const result = totalPoints[player.team.toString()].result;

          const ratingChange = isRated ? (result === 'WIN' ? 10 : result === 'LOSS' ? -10 : 0) : 0;

          const divisions = Object.entries(normalizedStatsData.divisions).reduce(
            (acc, [key, value]) => {
              if (value[userId]) {
                acc[key] = value[userId];
              }
              return acc;
            },
            {} as Record<string, { scores: number; result: MatchResult }>
          );

          return {
            ...player,
            ...damages,
            score,
            minesDamage,
            moneyTaken,
            armorTaken,
            wipeouts,
            divisions,
            result,
            ratingChange,
          };
        });

        // Создаем новый матч с ID и датой создания старого
        const newMatch = await tx.match.create({
          data: {
            id: editMatchId,
            createdAt: originalCreatedAt,
            mode: matchData.mode,
            creatorId: matchData.creatorId,
            isRated,
            totalScore,
            players: {
              create: matchPlayers,
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

        // Обновляем статистику игроков
        await Promise.all(
          newMatch.players
            .filter((player) => !player.userId.startsWith('bot_'))
            .map(async (player) => {
              const stats = (await tx.stats.findUnique({
                where: { userId: player.userId },
              })) as Stats;
              return tx.stats.update({
                where: { userId: player.userId },
                data: {
                  gamesPlayed: { increment: 1 },
                  rating: { increment: player.ratingChange },
                  wins: player.result === 'WIN' ? { increment: 1 } : undefined,
                  losses: player.result === 'LOSS' ? { increment: 1 } : undefined,
                  draws: player.result === 'DRAW' ? { increment: 1 } : undefined,
                  totalScore: { increment: player.score },
                  totalDivisions: { increment: Object.keys(player.divisions as Divisions).length },
                  maxRating: {
                    set:
                      player.ratingChange > 0
                        ? Math.max(stats.rating + player.ratingChange, stats.maxRating)
                        : stats.maxRating,
                  },
                  minRating: {
                    set:
                      player.ratingChange < 0
                        ? Math.min(stats.rating + player.ratingChange, stats.minRating)
                        : stats.minRating,
                  },
                  winsDivisions: {
                    increment: Object.values(player.divisions as Divisions).filter(
                      (division) => division.result === 'WIN'
                    ).length,
                  },
                  lossesDivisions: {
                    increment: Object.values(player.divisions as Divisions).filter(
                      (division) => division.result === 'LOSS'
                    ).length,
                  },
                  drawsDivisions: {
                    increment: Object.values(player.divisions as Divisions).filter(
                      (division) => division.result === 'DRAW'
                    ).length,
                  },
                },
              });
            })
        );

        return newMatch;
      });
    } catch (error) {
      throw error;
    }
  }

  async findById(id: string) {
    const match = await this.prisma.match.findUnique({
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

    if (!match) {
      return null;
    }

    return { ...match, isLast: await this.isLastCreatedMatch(id) };
  }

  async isLastCreatedMatch(id: string): Promise<boolean> {
    const lastMatch = await this.prisma.match.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    return id === lastMatch?.id;
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
          createdAt: 'desc',
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
    return await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
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

      if (!match) {
        throw new Error(`Match with id ${id} not found`);
      }

      // Сохраняем копию данных матча для возврата после удаления
      const matchData = { ...match };

      await Promise.all(
        match.players
          .filter((player) => !player.userId.startsWith('bot_'))
          .map(async (player) => {
            const stats = (await tx.stats.findUnique({
              where: { userId: player.userId },
            })) as Stats;
            return tx.stats.update({
              where: { userId: player.userId },
              data: {
                gamesPlayed: { decrement: 1 },
                rating: { decrement: player.ratingChange },
                wins: player.result === 'WIN' ? { decrement: 1 } : undefined,
                losses: player.result === 'LOSS' ? { decrement: 1 } : undefined,
                draws: player.result === 'DRAW' ? { decrement: 1 } : undefined,
                totalScore: { decrement: player.score },
                totalDivisions: { decrement: Object.keys(player.divisions as Divisions).length },
                winsDivisions: {
                  decrement: Object.values(player.divisions as Divisions).filter(
                    (division) => division.result === 'WIN'
                  ).length,
                },
                lossesDivisions: {
                  decrement: Object.values(player.divisions as Divisions).filter(
                    (division) => division.result === 'LOSS'
                  ).length,
                },
                drawsDivisions: {
                  decrement: Object.values(player.divisions as Divisions).filter(
                    (division) => division.result === 'DRAW'
                  ).length,
                },
                maxRating: {
                  set:
                    player.ratingChange > 0 && stats.maxRating === stats.rating
                      ? stats.maxRating - player.ratingChange
                      : stats.maxRating,
                },
                minRating: {
                  set:
                    player.ratingChange < 0 && stats.minRating === stats.rating
                      ? stats.minRating - player.ratingChange
                      : stats.minRating,
                },
              },
            });
          })
      );

      // Удаляем связанные записи игроков
      await tx.matchPlayer.deleteMany({
        where: { matchId: id },
      });

      // Удаляем сам матч
      await tx.match.delete({
        where: { id },
      });

      // Возвращаем сохраненные данные матча
      return matchData;
    });
  }
}
