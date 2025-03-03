import {
  GameMode,
  Match,
  MatchPlayer,
  MatchResult,
  PrismaClient,
  User,
} from "@prisma/client";
import { CreateMatchData, CreateMatchPlayer, CreateStatsData, Damages, EditMatchDataSchema, NormalizedStatsData } from "./schemas";

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


  

  // private calculateResult(
  //   mode: GameMode,
  //   team: number,
  //   scores: number[],
  //   isRated: boolean
  // ): MatchResultData {
  //   let result: "WIN" | "LOSS" | "DRAW";
  //   let ratingChange = 0;

  //   if (mode === "TWO_VS_TWO_VS_TWO") {
  //     const teamScores = [scores[0], scores[1], scores[2]];
  //     const playerTeamScore = teamScores[team - 1];
  //     const maxScore = Math.max(...teamScores);

  //     if (playerTeamScore === maxScore) {
  //       const winners = teamScores.filter((score) => score === maxScore).length;
  //       result = winners > 1 ? "DRAW" : "WIN";
  //       ratingChange = winners > 1 ? 0 : 1;
  //     } else {
  //       result = "LOSS";
  //       ratingChange = -1;
  //     }
  //   } else {
  //     const [team1Score, team2Score] = scores;
  //     if (team1Score === team2Score) {
  //       result = "DRAW";
  //       ratingChange = 0;
  //     } else if (
  //       (team === 1 && team1Score > team2Score) ||
  //       (team === 2 && team2Score > team1Score)
  //     ) {
  //       result = "WIN";
  //       ratingChange = 1;
  //     } else {
  //       result = "LOSS";
  //       ratingChange = -1;
  //     }
  //   }

  //   return {
  //     result,
  //     ratingChange: isRated ? ratingChange : 0,
  //   };
  // }






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
      userId,
      totalDamageDealt,
      totalDamageReceived,
      damageDealt,
      damageReceived
    };
  }


  private calculateResult(scores: Record<string, number>, player: CreateMatchPlayer, players: CreateMatchPlayer[]) {



    const teamScores = players.reduce((acc, player) => {
      if (acc[player.team]) {
        acc[player.team] += scores[player.userId];
      } else {
        acc[player.team] = scores[player.userId];
      }
      return acc;
    }, {} as Record<number, number>);

    const maxScore = Math.max(...Object.values(teamScores));
    const isDraw = Object.values(teamScores).filter(score => score === maxScore).length === Object.values(teamScores).length;
    if (isDraw) {
      return "DRAW";
    } else if (teamScores[player.team] === maxScore) {
      return "WIN";
    } else {
      return "LOSS";
    }
    

  }

  private isRated(mode: GameMode, players: CreateMatchPlayer[]) {
    const realPlayers = players.filter(player => !player.userId.startsWith("bot_"));
    if (mode === "TWO_VS_TWO_VS_TWO" || realPlayers.length !== players.length) {
      return false;
    } else {
      return true;
    }
  }

  async create(data: CreateMatchData) {
    const normalizedStatsData = this.normalizeStatsData(data.statsData, data.players);
    const realPlayers = data.players.filter(player => !player.userId.startsWith("bot_"));
    realPlayers.map(player => {
      const { userId } = player;
      const damages = this.calculatePlayerDamage(player.userId, normalizedStatsData.damage, data.players);
      const scores = normalizedStatsData.scores[userId];
      const minesDamage = normalizedStatsData.mines_damage[userId];
      const moneyTaken = normalizedStatsData.money_taken[userId];
      const armorTaken = normalizedStatsData.armor_taken[userId];
      const wipeouts = normalizedStatsData.wipeouts[userId];

      const divisions = Object.entries(normalizedStatsData.divisions).reduce((acc,[key, value]) => {
        if (value[userId]) {
          acc[key] = value[userId];
        }
        return acc;
      }, {} as Record<string, {scores: number, result: MatchResult}>);

      const result = this.calculateResult(normalizedStatsData.scores, player, data.players);

      return {
        ...player,
        ...damages,
        scores,
        minesDamage,
        moneyTaken,
        armorTaken,
        wipeouts,
        divisions,
        result
      }

      });

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
