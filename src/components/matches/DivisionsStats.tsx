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

interface DivisionsStatsProps {
  players: MatchPlayer[];
}

export const DivisionsStats: React.FC<DivisionsStatsProps> = ({ players }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';


  const sortedPlayers = [...players].sort((a, b) => a.team - b.team);

  const allDivisions = new Set<string>();
  sortedPlayers.forEach((player) => {
    Object.keys(player.divisions).forEach((divisionKey) => {
      allDivisions.add(divisionKey);
    });
  });

  const divisionBaseOrder = [
    'chem_vi',
    'drakonis',
    'bogmire',
    'new_mojave',
    'nho',
    'inferno',
    'terra',
    'amphibious',
    'valhalla',
    'flowbaern',
    'antarsis',
    'sigmia_vii',
  ];

  const getBaseName = (division: string) => {
    if (division.endsWith('_a') || division.endsWith('_b')) {
      return division.slice(0, -2);
    }
    return division;
  };

  const formatDivisionName = (division: string) => {
    const baseNames: Record<string, string> = {
      chem_vi: 'CHEM VI',
      drakonis: 'Drakonis',
      bogmire: 'Bogmire',
      new_mojave: 'New Mojave',
      nho: 'NHO',
      inferno: 'Inferno',
      terra: 'Terra',
      amphibious: 'Amphibious',
      valhalla: 'Valhalla',
      flowbaern: 'Flowbaern',
      antarsis: 'Antarsis',
      sigmia_vii: 'Sigmia VII',
    };

    const base = getBaseName(division);
    const suffix = division.endsWith('_a') ? ' A' : division.endsWith('_b') ? ' B' : '';

    return (baseNames[base] || base) + suffix;
  };

  const sortedDivisions = Array.from(allDivisions).sort((a, b) => {
    const baseA = getBaseName(a);
    const baseB = getBaseName(b);

    const indexA = divisionBaseOrder.indexOf(baseA);
    const indexB = divisionBaseOrder.indexOf(baseB);

    if (baseA === baseB) {
      return a > b ? -1 : 1;
    }

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    if (indexA !== -1) {
      return -1;
    }

    if (indexB !== -1) {
      return 1;
    }

    return a.localeCompare(b);
  });

  const teamGroups = sortedPlayers.reduce<Record<number, MatchPlayer[]>>((acc, player) => {
    if (!acc[player.team]) {
      acc[player.team] = [];
    }
    acc[player.team].push(player);
    return acc;
  }, {});

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
    result: {
      WIN: {
        text: isDark ? 'text-green-300' : 'text-green-500',
      },
      LOSS: {
        text: isDark ? 'text-red-300' : 'text-red-500',
      },
      DRAW: {
        text: isDark ? 'text-amber-300' : 'text-amber-500',
      },
    },
    total: {
      bg: isDark ? 'bg-muted/40' : 'bg-muted/40',
    },
  };

  return (
    <Card className="shadow-sm border rounded-lg overflow-hidden">
      <CardHeader className="bg-card py-3 px-4 border-b">
        <CardTitle className="text-xl">Статистика по дивизионам</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px] sticky left-0 z-10 shadow-sm border-r bg-card">
                  Игрок
                </TableHead>
                <TableHead className={`${colors.total.bg} font-medium text-center border-r`}>
                  Всего очков
                </TableHead>
                {sortedDivisions.map((division) => (
                  <TableHead key={division} className="font-medium text-center">
                    {formatDivisionName(division)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Строки по командам */}
              {Object.entries(teamGroups).map(([team]) => (
                <React.Fragment key={`team-rows-${team}`}>
                  {teamGroups[parseInt(team)].map((player) => {
                    // Общее количество очков за все дивизии
                    const totalScores = Object.values(player.divisions).reduce(
                      (total, div) => total + div.scores,
                      0
                    );

                    return (
                      <TableRow key={player.userId} className="hover:bg-muted/5 transition-colors">
                        <TableCell
                          className={`font-medium sticky left-0 z-10 shadow-sm border-r bg-card ${
                            colors.team[player.team as 1 | 2 | 3].text
                          }`}
                        >
                          {player.user.name || 'Игрок'}
                        </TableCell>

                        <TableCell className={`${colors.total.bg} font-bold text-center border-r`}>
                          <span className="text-lg">{totalScores}</span>
                        </TableCell>

                        {sortedDivisions.map((division) => {
                          const divData = player.divisions[division];
                          if (!divData) {
                            return (
                              <TableCell
                                key={division}
                                className="text-muted-foreground text-center"
                              >
                                <span className="opacity-40">-</span>
                              </TableCell>
                            );
                          }

                          const resultStyle = colors.result[divData.result];

                          return (
                            <TableCell key={division} className="text-center transition-colors">
                              <span className={`text-lg font-medium ${resultStyle.text}`}>
                                {divData.scores}
                              </span>
                            </TableCell>
                          );
                        })}
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
