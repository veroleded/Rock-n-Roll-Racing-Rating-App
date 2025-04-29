import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTheme } from 'next-themes';
import React from 'react';
import { MatchPlayer } from './types';

interface DamageMatrixProps {
  players: MatchPlayer[];
}

interface DamageData {
  [key: string]: number;
}

interface MatrixRow {
  attackerId: string;
  attackerName: string;
  team: number;
  damages: DamageData;
}

export const DamageMatrix: React.FC<DamageMatrixProps> = ({ players }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Сортируем игроков по командам, чтобы союзники были рядом
  const sortedPlayers = [...players].sort((a, b) => a.team - b.team);

  // Подготовка данных для матрицы урона
  const matrixData: MatrixRow[] = sortedPlayers.map((attacker) => {
    const damages: DamageData = {};

    // Заполняем урон по каждому игроку
    sortedPlayers.forEach((victim) => {
      // Получаем урон по ключу (ID игрока)
      const damageEntry = attacker.damageDealt[victim.userId];

      // Если есть запись о нанесенном уроне
      if (damageEntry) {
        damages[victim.userId] = damageEntry.damage;
      } else {
        damages[victim.userId] = 0;
      }
    });

    return {
      attackerId: attacker.userId,
      attackerName: attacker.user.name || 'Игрок',
      team: attacker.team,
      damages,
    };
  });

  // Минималистичная цветовая схема
  const colors = {
    team: {
      1: {
        text: isDark ? 'text-blue-300' : 'text-blue-600',
      },
      2: {
        text: isDark ? 'text-red-300' : 'text-red-600',
      },
      3: {
        text: isDark ? 'text-yellow-300' : 'text-yellow-600',
      },
    },
    damage: {
      friendly: {
        text: isDark ? 'text-red-300' : 'text-red-500',
      },
      enemy: {
        high: isDark ? 'text-primary font-bold' : 'text-primary font-bold',
        medium: isDark ? 'text-primary/95 font-semibold' : 'text-primary/90 font-semibold',
        low: isDark ? 'text-primary/85' : 'text-primary/80',
      },
      none: isDark ? 'text-muted-foreground opacity-30' : 'text-muted-foreground opacity-40',
      self: isDark ? 'bg-accent/30' : 'bg-accent/20',
    },
    total: {
      bg: isDark ? 'bg-muted/40' : 'bg-muted/50',
      text: 'text-foreground',
    },
  };

  // Функция для определения цвета урона в зависимости от его величины
  const getDamageStyle = (damage: number, isTeammate: boolean) => {
    if (damage === 0) {
      return colors.damage.none;
    }

    if (isTeammate) {
      return colors.damage.friendly.text;
    }

    // Найдем максимальный урон для масштабирования
    const maxDamage = Math.max(
      ...matrixData.flatMap((row) => Object.values(row.damages).filter((d) => d > 0))
    );

    const damageRatio = damage / maxDamage;

    if (damageRatio > 0.7) {
      return colors.damage.enemy.high;
    } else if (damageRatio > 0.3) {
      return colors.damage.enemy.medium;
    } else {
      return colors.damage.enemy.low;
    }
  };

  // Группируем игроков по команде для заголовков
  const teamGroups = sortedPlayers.reduce<Record<number, MatchPlayer[]>>((acc, player) => {
    if (!acc[player.team]) {
      acc[player.team] = [];
    }
    acc[player.team].push(player);
    return acc;
  }, {});

  return (
    <Card className="shadow-sm border rounded-lg overflow-hidden">
      <CardHeader className="bg-card py-3 px-4 border-b">
        <CardTitle className="text-xl">Матрица урона между игроками</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px] sticky left-0 z-10 shadow-sm border-r bg-card">
                  Атакующий \ Получатель
                </TableHead>

                {/* Заголовки команд */}
                {Object.entries(teamGroups).map(([team, teamPlayers]) => (
                  <React.Fragment key={`team-header-${team}`}>
                    {teamPlayers.map((player) => (
                      <TableHead
                        key={player.userId}
                        className={`${colors.team[player.team as 1 | 2 | 3].text} text-center`}
                      >
                        {player.user.name || 'Игрок'}
                      </TableHead>
                    ))}
                  </React.Fragment>
                ))}

                <TableHead
                  className={`${colors.total.bg} font-bold text-center sticky right-0 z-10 shadow-sm`}
                >
                  Всего
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Строки по командам */}
              {Object.entries(teamGroups).map(([team]) => (
                <React.Fragment key={`team-rows-${team}`}>
                  {matrixData
                    .filter((row) => row.team === parseInt(team))
                    .map((row) => {
                      // Вычисляем общий нанесенный урон
                      const totalDamage = sortedPlayers.reduce(
                        (sum, victim) => sum + (row.damages[victim.userId] || 0),
                        0
                      );

                      // Урон по союзникам
                      const teamDamage = sortedPlayers
                        .filter((p) => p.team === row.team && p.userId !== row.attackerId)
                        .reduce((sum, victim) => sum + (row.damages[victim.userId] || 0), 0);

                      return (
                        <TableRow
                          key={row.attackerId}
                          className="hover:bg-muted/5 transition-colors"
                        >
                          <TableCell
                            className={`font-medium sticky left-0 z-10 shadow-sm border-r bg-card ${
                              colors.team[row.team as 1 | 2 | 3].text
                            }`}
                          >
                            {row.attackerName}
                          </TableCell>

                          {/* Ячейки с уроном по командам */}
                          {Object.entries(teamGroups).map(([victimTeam, victimPlayers]) => (
                            <React.Fragment key={`damage-cells-${row.attackerId}-${victimTeam}`}>
                              {victimPlayers.map((victim) => {
                                const damage = row.damages[victim.userId];
                                const isTeammate = victim.team === row.team;
                                const isSelf = victim.userId === row.attackerId;

                                // Определяем стиль ячейки в зависимости от урона
                                const cellStyle = getDamageStyle(damage, isTeammate && !isSelf);

                                return (
                                  <TableCell
                                    key={victim.userId}
                                    className={`${cellStyle} text-center ${
                                      isSelf ? colors.damage.self : ''
                                    } transition-colors`}
                                  >
                                    {damage > 0 ? damage : '-'}
                                  </TableCell>
                                );
                              })}
                            </React.Fragment>
                          ))}

                          <TableCell
                            className={`${colors.total.bg} font-bold text-center sticky right-0 z-10 shadow-sm`}
                          >
                            <div className="flex flex-col">
                              <span className={colors.total.text}>{totalDamage}</span>
                              {teamDamage > 0 && (
                                <span className={`text-xs ${colors.damage.friendly.text}`}>
                                  По союзникам: {teamDamage}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
