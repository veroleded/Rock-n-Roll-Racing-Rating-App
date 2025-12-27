import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useI18n } from '@/lib/i18n/context';
import { useTheme } from 'next-themes';
import React, { useCallback, useMemo } from 'react';
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
  const { t } = useI18n();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.team - b.team), [players]);

  const matrixData: MatrixRow[] = useMemo(
    () =>
      sortedPlayers.map((attacker) => {
    const damages: DamageData = {};

    sortedPlayers.forEach((victim) => {
      const damageEntry = attacker.damageDealt[victim.userId];
      if (damageEntry) {
        damages[victim.userId] = damageEntry.damage;
      } else {
        damages[victim.userId] = 0;
      }
    });

    return {
      attackerId: attacker.userId,
      attackerName: attacker.user.name || t('common.player'),
      team: attacker.team,
      damages,
    };
      }),
    [sortedPlayers]
  );

  const colors = useMemo(
    () => ({
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
    }),
    [isDark]
  );

  const maxDamage = useMemo(
    () =>
      Math.max(
        ...matrixData.flatMap((row) => Object.values(row.damages).filter((d) => d > 0)),
        0
      ),
    [matrixData]
  );

  const getDamageStyle = useCallback(
    (damage: number, isTeammate: boolean) => {
    if (damage === 0) {
      return colors.damage.none;
    }

    if (isTeammate) {
      return colors.damage.friendly.text + ' font-semibold';
    }

    if (maxDamage === 0) {
      return colors.damage.none;
    }

    const damageRatio = damage / maxDamage;

    if (damageRatio > 0.7) {
      return colors.damage.enemy.high;
    } else if (damageRatio > 0.3) {
      return colors.damage.enemy.medium;
    } else {
      return colors.damage.enemy.low + ' font-medium';
    }
    },
    [colors, maxDamage]
  );

  const teamGroups = useMemo(
    () =>
      sortedPlayers.reduce<Record<number, MatchPlayer[]>>((acc, player) => {
    if (!acc[player.team]) {
      acc[player.team] = [];
    }
    acc[player.team].push(player);
    return acc;
      }, {}),
    [sortedPlayers]
  );

  return (
    <Card className="shadow-sm border rounded-lg overflow-hidden">
      <CardHeader className="bg-card py-3 px-4 border-b">
        <CardTitle className="text-xl">{t('common.damageMatrix')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[600px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px] sticky left-0 z-10 shadow-sm border-r bg-card">
                  {t('common.attackerRecipient')}
                </TableHead>

                {Object.entries(teamGroups).map(([team, teamPlayers]) => (
                  <React.Fragment key={`team-header-${team}`}>
                    {teamPlayers.map((player) => (
                      <TableHead
                        key={player.userId}
                        className={`${colors.team[player.team as 1 | 2 | 3].text} text-center font-semibold`}
                      >
                        {player.user.name || t('common.player')}
                      </TableHead>
                    ))}
                  </React.Fragment>
                ))}

                <TableHead
                  className={`${colors.total.bg} font-bold text-center sticky right-0 z-10 shadow-sm`}
                >
                  {t('common.total')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(teamGroups).map(([team]) => (
                <React.Fragment key={`team-rows-${team}`}>
                  {matrixData
                    .filter((row) => row.team === parseInt(team))
                    .map((row) => {
                      const totalDamage = sortedPlayers.reduce(
                        (sum, victim) => sum + (row.damages[victim.userId] || 0),
                        0
                      );

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

                          {Object.entries(teamGroups).map(([victimTeam, victimPlayers]) => (
                            <React.Fragment key={`damage-cells-${row.attackerId}-${victimTeam}`}>
                              {victimPlayers.map((victim) => {
                                const damage = row.damages[victim.userId];
                                const isTeammate = victim.team === row.team;
                                const isSelf = victim.userId === row.attackerId;

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
                                  {t('common.damageToAllies')}: {teamDamage}
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
