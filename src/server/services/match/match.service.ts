import { Divisions } from "@/types/json-types";
import {
  GameMode,
  Match,
  MatchPlayer,
  MatchResult,
  PrismaClient,
  Stats,
  User,
} from "@prisma/client";
import { CreateMatchData, CreateMatchPlayer, CreateStatsData, Damages, EditMatchDataSchema, NormalizedDivisionData, NormalizedStatsData } from "./schemas";

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

  private normalizeStatsData(statsData: CreateStatsData, players: CreateMatchPlayer[]): NormalizedStatsData {
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


    const singleLevelFields = ['scores', 'mines_damage', 'money_taken', 'armor_taken', 'wipeouts'] as const;
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
            result = teamsWithMaxScore > 1 ? "DRAW" : "WIN";
          } else {
            result = "LOSS";
          }
          
          normalizedStatsData.divisions[divisionName][userId] = {
            result,
            scores: score
          };
        }
      }
    }
    return normalizedStatsData;
  }



  private calculatePlayerDamage(userId: string, normalizedDamage: Record<string, Record<string, number>>, players: CreateMatchPlayer[]) {
    const playerTeams = new Map<string, number>();
    players.forEach(player => {
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
          damage: damageAmount
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
          damage: targets[userId]
        };
        
        totalDamageReceived += targets[userId];
      }
    });
    
    
    return {
      totalDamageDealt,
      totalDamageReceived,
      damageDealt,
      damageReceived
    };
  }

  private calculateTeamResultDivisions(divisions: NormalizedDivisionData, players: CreateMatchPlayer[]) {
    // Сначала собираем информацию о очках пользователей по дивизиям и командам
    const teamsScores = Object.entries(divisions).reduce((acc, [divisionName, playersResult]) => {
      players.forEach(player => {
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
    }, {} as Record<string, Record<number, { scoresSum: number; userScores: Record<string, number>; }>>);

    // Теперь определяем результаты для каждой команды
    const teamsResult = Object.entries(teamsScores).reduce((acc, [divisionName, teams]) => {
      const maxScore = Math.max(...Object.values(teams).map(team => team.scoresSum));
      const isDraw = Object.values(teams).filter(team => team.scoresSum === maxScore).length === Object.values(teams).length;

      const divisionTeamsResult = Object.entries(teams).reduce((teamAcc, [teamStr, teamData]) => {
        const team = Number(teamStr);
        if (isDraw) {
          teamAcc[team] = {
            scoresSum: teamData.scoresSum,
            result: "DRAW",
            points: 1,
            userScores: teamData.userScores
          };
        } else if (teamData.scoresSum === maxScore) {
          teamAcc[team] = {
            scoresSum: teamData.scoresSum,
            result: "WIN",
            points: 2,
            userScores: teamData.userScores
          };
        } else {
          teamAcc[team] = {
            scoresSum: teamData.scoresSum,
            result: "LOSS",
            points: 0,
            userScores: teamData.userScores
          };
        }
        return teamAcc;
      }, {} as Record<number, { scoresSum: number, result: MatchResult, points: 0 | 1 | 2, userScores: Record<string, number>; }>);

      acc[divisionName] = divisionTeamsResult;
      return acc;
    }, {} as Record<string, Record<number, { scoresSum: number, result: MatchResult, points: 0 | 1 | 2, userScores: Record<string, number>; }>>);

    return teamsResult;
  }

  private isRated(mode: GameMode, players: CreateMatchPlayer[]) {
    const realPlayers = players.filter(player => !player.userId.startsWith("bot_"));
    if (mode === "TWO_VS_TWO_VS_TWO" || realPlayers.length !== players.length) {
      return false;
    } else {
      return true;
    }
  }

  private calculateTotalPoints(divisions: Record<string, Record<number, {
    scoresSum: number;
    result: MatchResult;
    points: 0 | 1 | 2;
    userScores: Record<string, number>;
  }>>) {
    const totalPoints = Object.entries(divisions).reduce((acc, [, teams]) => {
      Object.entries(teams).forEach(([team, data]) => {
        if (!acc[team]) {
          acc[team] = 0;
        }
        acc[team] += data.points;
      });
      return acc;
    }, {} as Record<string, number>);

    const maxPoints = Math.max(...Object.values(totalPoints));
    const isDraw = Object.values(totalPoints).filter(points => points === maxPoints).length === Object.values(totalPoints).length;
    const totalResult = Object.entries(totalPoints).reduce((acc, [team, points]) => {
      if (isDraw) {
        acc[team] = {
          points,
          result: "DRAW"
        };
      } else if (points === maxPoints) {
        acc[team] = {
          points,
          result: "WIN"
        };
      } else {
        acc[team] = {
          points,
          result: "LOSS"
        };
      }
      return acc;
    }, {} as Record<string, { points: number, result: MatchResult; }>);

    return totalResult;
  }


  async create(data: CreateMatchData) {
    try {


      const normalizedStatsData = this.normalizeStatsData(data.statsData, data.players);
      const teamsResult = this.calculateTeamResultDivisions(normalizedStatsData.divisions, data.players);
      const totalPoints = this.calculateTotalPoints(teamsResult);
      const totalScore = Object.values(totalPoints).map(team => team.points).join(' - ');
      const isRated = this.isRated(data.mode, data.players);
      console.log(totalScore);
      const matchPlayers = data.players.map(player => {
      const { userId } = player;
      const damages = this.calculatePlayerDamage(player.userId, normalizedStatsData.damage, data.players);
        const score = normalizedStatsData.scores[userId];
      const minesDamage = normalizedStatsData.mines_damage[userId];
      const moneyTaken = normalizedStatsData.money_taken[userId];
      const armorTaken = normalizedStatsData.armor_taken[userId];
      const wipeouts = normalizedStatsData.wipeouts[userId];
        const result = totalPoints[player.team.toString()].result;

        const ratingChange = isRated ? (result === "WIN" ? 10 : result === "LOSS" ? -10 : 0) : 0;

      const divisions = Object.entries(normalizedStatsData.divisions).reduce((acc,[key, value]) => {
        if (value[userId]) {
          acc[key] = value[userId];
        }
        return acc;
      }, {} as Record<string, {scores: number, result: MatchResult}>);

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
        ratingChange
      }

      });

      const match = await this.prisma.match.create({
        data: {
          mode: data.mode,
          creatorId: data.creatorId,
          isRated,
          totalScore,
          players: {
            create: matchPlayers
          }
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
          .map(async (player) => {
            const stats = await this.prisma.stats.findUnique({ where: { userId: player.userId } }) as Stats;
            return this.prisma.stats.update({
              where: { userId: player.userId },
              data: {
                gamesPlayed: { increment: 1 },
                rating: { increment: player.ratingChange },
                wins: player.result === "WIN" ? { increment: 1 } : undefined,
                losses: player.result === "LOSS" ? { increment: 1 } : undefined,
                draws: player.result === "DRAW" ? { increment: 1 } : undefined,
                totalScore: { increment: player.score },
                totalDivisions: { increment: Object.keys(player.divisions as Divisions).length },
                maxRating: {
                  set: player.ratingChange > 0
                    ? Math.max(stats.rating + player.ratingChange, stats.maxRating)
                    : stats.maxRating
                },
                minRating: {
                  set: player.ratingChange < 0
                    ? Math.min(stats.rating + player.ratingChange, stats.minRating)
                    : stats.minRating
                },
                winsDivisions: {
                  increment: Object.values(player.divisions as Divisions)
                    .filter(division => division.result === "WIN").length
                },
                lossesDivisions: {
                  increment: Object.values(player.divisions as Divisions)
                    .filter(division => division.result === "LOSS").length
                },
                drawsDivisions: {
                  increment: Object.values(player.divisions as Divisions)
                    .filter(division => division.result === "DRAW").length
                },
              },
            })
          })
      );

      return match;

    } catch (error) {
      console.error('Error create match.service', error);
      throw error;
    }
  }


  async edit(editData: EditMatchDataSchema) {
    try {
      const { editMatchId, ...matchData } = editData;
      const editedMatch = await this.delete(editMatchId);
      const newMatch = await this.create(matchData);
      return await this.prisma.match.update({
        where: {
          id: newMatch.id
        },
        data: { createdAt: editedMatch?.createdAt }
      });
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
        .map(async (player) => {
          const stats = await this.prisma.stats.findUnique({ where: { userId: player.userId } }) as Stats;
          return this.prisma.stats.update({
            where: { userId: player.userId },
            data: {
              gamesPlayed: { decrement: 1 },
              rating: { decrement: player.ratingChange },
              wins: player.result === "WIN" ? { decrement: 1 } : undefined,
              losses: player.result === "LOSS" ? { decrement: 1 } : undefined,
              draws: player.result === "DRAW" ? { decrement: 1 } : undefined,
              totalScore: { decrement: player.score },
              totalDivisions: { decrement: Object.keys(player.divisions as Divisions).length },
              winsDivisions: {
                decrement: Object.values(player.divisions as Divisions)
                  .filter(division => division.result === "WIN").length
              },
              lossesDivisions: {
                decrement: Object.values(player.divisions as Divisions)
                  .filter(division => division.result === "LOSS").length
              },
              drawsDivisions: {
                decrement: Object.values(player.divisions as Divisions)
                  .filter(division => division.result === "DRAW").length
              },
              maxRating: {
                set: player.ratingChange > 0 && stats.maxRating === stats.rating
                  ? stats.maxRating - player.ratingChange
                  : stats.maxRating
              },
              minRating: {
                set: player.ratingChange < 0 && stats.minRating === stats.rating
                  ? stats.minRating - player.ratingChange// Используем 1000 как начальное значение рейтинга
                  : stats.minRating
              },
            },
          })
        })
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
