'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/context';
import { useTheme } from 'next-themes';
import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MatchPlayer } from './types';

const COLORS = {
  light: {
    team1: '#2563eb',
    team2: '#dc2626',
    team3: '#ca8a04',
    gradient1: ['#60a5fa', '#2563eb'],
    gradient2: ['#f87171', '#dc2626'],
    gradient3: ['#fcd34d', '#ca8a04'],
    text: '#1e293b',
    grid: '#e2e8f0',
    labelText: '#1e293b',
    tooltip: {
      background: 'rgba(255, 255, 255, 0.95)',
      border: '#cbd5e1',
      shadow: '0 4px 8px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)',
    },
    chart: {
      background: 'rgba(248, 250, 252, 0.85)',
      border: '#e2e8f0',
    },
  },
  dark: {
    team1: '#60a5fa',
    team2: '#f87171',
    team3: '#facc15',
    gradient1: ['#93c5fd', '#3b82f6'],
    gradient2: ['#fca5a5', '#ef4444'],
    gradient3: ['#fde68a', '#eab308'],
    text: '#f8fafc',
    grid: '#334155',
    labelText: '#f8fafc',
    tooltip: {
      background: 'rgba(15, 23, 42, 0.98)',
      border: '#475569',
      shadow: '0 4px 8px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.15)',
    },
    chart: {
      background: 'rgba(30, 41, 59, 0.7)',
      border: '#334155',
    },
  },
};

interface MatchStatsProps {
  players: MatchPlayer[];
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
    payload: {
      team: number;
      name: string;
      [key: string]: unknown;
    };
  }>;
  label?: string;
};

export const MatchStats: React.FC<MatchStatsProps> = ({ players }) => {
  const { t } = useI18n();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const theme = isDark ? 'dark' : 'light';
  const colors = COLORS[theme];

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.team - b.team), [players]);

  const cardStyles = useMemo(
    () => ({
      headerBg: 'bg-primary/10',
      shadow: isDark ? 'shadow-md shadow-primary/5' : 'shadow-lg shadow-primary/10',
      border: isDark ? 'border-slate-800' : 'border-slate-200',
      chartBg: isDark ? 'bg-slate-900/50' : 'bg-slate-50/80',
      chartBorder: isDark ? 'border-slate-800' : 'border-slate-200',
    }),
    [isDark]
  );

  const damageData = useMemo(
    () =>
      sortedPlayers.map((player) => ({
        name: player.user.name || t('common.player'),
        damage: player.totalDamageDealt,
        team: player.team,
      })),
    [sortedPlayers, t]
  );

  const damageTakenData = useMemo(
    () =>
      sortedPlayers.map((player) => ({
        name: player.user.name || t('common.player'),
        damage: player.totalDamageReceived,
        team: player.team,
      })),
    [sortedPlayers, t]
  );

  const moneyData = useMemo(
    () =>
      sortedPlayers.map((player) => ({
        name: player.user.name || t('common.player'),
        money: player.moneyTaken,
        team: player.team,
      })),
    [sortedPlayers, t]
  );

  const armorData = useMemo(
    () =>
      sortedPlayers.map((player) => ({
        name: player.user.name || t('common.player'),
        armor: player.armorTaken,
        team: player.team,
      })),
    [sortedPlayers, t]
  );

  const wipeoutsData = useMemo(
    () =>
      sortedPlayers.map((player) => ({
        name: player.user.name || t('common.player'),
        wipeouts: player.wipeouts,
        team: player.team,
      })),
    [sortedPlayers, t]
  );

  const minesDamageData = useMemo(
    () =>
      sortedPlayers
        .map((player) => ({
          name: player.user.name || t('common.player'),
          value: player.minesDamage,
          team: player.team,
        }))
        .filter((item) => item.value > 0),
    [sortedPlayers, t]
  );

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const teamNumber = payload[0].payload.team;
      let teamColor;

      if (teamNumber === 1) {
        teamColor = colors.team1;
      } else if (teamNumber === 2) {
        teamColor = colors.team2;
      } else if (teamNumber === 3) {
        teamColor = colors.team3;
      } else {
        teamColor = colors.text;
      }

      return (
        <div
          className="p-3 rounded-md shadow-md"
          style={{
            backgroundColor: colors.tooltip.background,
            border: `1px solid ${colors.tooltip.border}`,
            boxShadow: colors.tooltip.shadow,
          }}
        >
          <p className="font-medium text-sm mb-1" style={{ color: teamColor }}>
            {label}
          </p>
          <p className="text-base font-bold" style={{ color: teamColor }}>
            {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  const labelListProps = {
    position: 'top' as const,
    fill: colors.labelText,
    fontSize: 12,
    fontWeight: 'bold',
  };

  return (
    <Card className={`border ${cardStyles.border} ${cardStyles.shadow} rounded-lg overflow-hidden`}>
      <CardHeader className={`${cardStyles.headerBg} py-3 px-4`}>
        <CardTitle className="text-xl">Графики статистики</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className={`h-80 p-4 rounded-lg border ${cardStyles.chartBorder} ${cardStyles.chartBg}`}
            style={{ backgroundColor: colors.chart.background, borderColor: colors.chart.border }}
          >
            <h3 className="text-lg font-medium mb-3 text-primary">Нанесенный урон</h3>
            <ResponsiveContainer width="100%" height="91%">
              <BarChart data={damageData} barGap={8} margin={{ top: 20 }}>
                <defs>
                  <linearGradient id="damageGradient1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradient1[0]} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={colors.gradient1[1]} stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="damageGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradient2[0]} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={colors.gradient2[1]} stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="damageGradient3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradient3[0]} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={colors.gradient3[1]} stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={colors.grid}
                  vertical={false}
                  opacity={0.6}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: colors.text, fontSize: 12 }}
                  axisLine={{ stroke: colors.grid }}
                  tickLine={{ stroke: colors.grid }}
                />
                <YAxis
                  tick={{ fill: colors.text, fontSize: 12 }}
                  axisLine={{ stroke: colors.grid }}
                  tickLine={{ stroke: colors.grid }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ opacity: 0.15 }} />
                <Bar dataKey="damage" name="Урон" radius={[5, 5, 0, 0]} maxBarSize={60}>
                  <LabelList dataKey="damage" {...labelListProps} />
                  {damageData.map((entry, index) => {
                    let fillGradient;
                    let strokeColor;

                    if (entry.team === 1) {
                      fillGradient = 'url(#damageGradient1)';
                      strokeColor = colors.team1;
                    } else if (entry.team === 2) {
                      fillGradient = 'url(#damageGradient2)';
                      strokeColor = colors.team2;
                    } else if (entry.team === 3) {
                      fillGradient = 'url(#damageGradient3)';
                      strokeColor = colors.team3;
                    }

                    return (
                      <Cell
                        key={`cell-dmg-${index}`}
                        fill={fillGradient}
                        stroke={strokeColor}
                        strokeWidth={1}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div
            className={`h-80 p-4 rounded-lg border ${cardStyles.chartBorder} ${cardStyles.chartBg}`}
            style={{ backgroundColor: colors.chart.background, borderColor: colors.chart.border }}
          >
            <h3 className="text-lg font-medium mb-3 text-primary">Полученный урон</h3>
            <ResponsiveContainer width="100%" height="91%">
              <BarChart data={damageTakenData} barGap={8} margin={{ top: 20 }}>
                <defs>
                  <linearGradient id="takenGradient1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradient1[0]} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={colors.gradient1[1]} stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="takenGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradient2[0]} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={colors.gradient2[1]} stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="takenGradient3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradient3[0]} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={colors.gradient3[1]} stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={colors.grid}
                  vertical={false}
                  opacity={0.6}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: colors.text, fontSize: 12 }}
                  axisLine={{ stroke: colors.grid }}
                  tickLine={{ stroke: colors.grid }}
                />
                <YAxis
                  tick={{ fill: colors.text, fontSize: 12 }}
                  axisLine={{ stroke: colors.grid }}
                  tickLine={{ stroke: colors.grid }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ opacity: 0.15 }} />
                <Bar dataKey="damage" name="Урон" radius={[5, 5, 0, 0]} maxBarSize={60}>
                  <LabelList dataKey="damage" {...labelListProps} />
                  {damageTakenData.map((entry, index) => {
                    let fillGradient;
                    let strokeColor;

                    if (entry.team === 1) {
                      fillGradient = 'url(#takenGradient1)';
                      strokeColor = colors.team1;
                    } else if (entry.team === 2) {
                      fillGradient = 'url(#takenGradient2)';
                      strokeColor = colors.team2;
                    } else if (entry.team === 3) {
                      fillGradient = 'url(#takenGradient3)';
                      strokeColor = colors.team3;
                    }

                    return (
                      <Cell
                        key={`cell-taken-${index}`}
                        fill={fillGradient}
                        stroke={strokeColor}
                        strokeWidth={1}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div
            className={`h-80 p-4 rounded-lg border ${cardStyles.chartBorder} ${cardStyles.chartBg}`}
            style={{ backgroundColor: colors.chart.background, borderColor: colors.chart.border }}
          >
            <h3 className="text-lg font-medium mb-3 text-primary">Собранные деньги</h3>
            <ResponsiveContainer width="100%" height="91%">
              <BarChart data={moneyData} barGap={8} margin={{ top: 20 }}>
                <defs>
                  <linearGradient id="moneyGradient1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradient1[0]} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={colors.gradient1[1]} stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="moneyGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradient2[0]} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={colors.gradient2[1]} stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="moneyGradient3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradient3[0]} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={colors.gradient3[1]} stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={colors.grid}
                  vertical={false}
                  opacity={0.6}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: colors.text, fontSize: 12 }}
                  axisLine={{ stroke: colors.grid }}
                  tickLine={{ stroke: colors.grid }}
                />
                <YAxis
                  tick={{ fill: colors.text, fontSize: 12 }}
                  axisLine={{ stroke: colors.grid }}
                  tickLine={{ stroke: colors.grid }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ opacity: 0.15 }} />
                <Bar dataKey="money" name="Деньги" radius={[5, 5, 0, 0]} maxBarSize={60}>
                  <LabelList dataKey="money" {...labelListProps} />
                  {moneyData.map((entry, index) => {
                    let fillGradient;
                    let strokeColor;

                    if (entry.team === 1) {
                      fillGradient = 'url(#moneyGradient1)';
                      strokeColor = colors.team1;
                    } else if (entry.team === 2) {
                      fillGradient = 'url(#moneyGradient2)';
                      strokeColor = colors.team2;
                    } else if (entry.team === 3) {
                      fillGradient = 'url(#moneyGradient3)';
                      strokeColor = colors.team3;
                    }

                    return (
                      <Cell
                        key={`cell-money-${index}`}
                        fill={fillGradient}
                        stroke={strokeColor}
                        strokeWidth={1}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div
            className={`h-80 p-4 rounded-lg border ${cardStyles.chartBorder} ${cardStyles.chartBg}`}
            style={{ backgroundColor: colors.chart.background, borderColor: colors.chart.border }}
          >
            <h3 className="text-lg font-medium mb-3 text-primary">Собранные аптечки</h3>
            <ResponsiveContainer width="100%" height="91%">
              <BarChart data={armorData} barGap={8} margin={{ top: 20 }}>
                <defs>
                  <linearGradient id="armorGradient1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradient1[0]} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={colors.gradient1[1]} stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="armorGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradient2[0]} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={colors.gradient2[1]} stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="armorGradient3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradient3[0]} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={colors.gradient3[1]} stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={colors.grid}
                  vertical={false}
                  opacity={0.6}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: colors.text, fontSize: 12 }}
                  axisLine={{ stroke: colors.grid }}
                  tickLine={{ stroke: colors.grid }}
                />
                <YAxis
                  tick={{ fill: colors.text, fontSize: 12 }}
                  axisLine={{ stroke: colors.grid }}
                  tickLine={{ stroke: colors.grid }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ opacity: 0.15 }} />
                <Bar dataKey="armor" name="Броня" radius={[5, 5, 0, 0]} maxBarSize={60}>
                  <LabelList dataKey="armor" {...labelListProps} />
                  {armorData.map((entry, index) => {
                    let fillGradient;
                    let strokeColor;

                    if (entry.team === 1) {
                      fillGradient = 'url(#armorGradient1)';
                      strokeColor = colors.team1;
                    } else if (entry.team === 2) {
                      fillGradient = 'url(#armorGradient2)';
                      strokeColor = colors.team2;
                    } else if (entry.team === 3) {
                      fillGradient = 'url(#armorGradient3)';
                      strokeColor = colors.team3;
                    }

                    return (
                      <Cell
                        key={`cell-armor-${index}`}
                        fill={fillGradient}
                        stroke={strokeColor}
                        strokeWidth={1}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div
            className={`h-80 p-4 rounded-lg border ${cardStyles.chartBorder} ${cardStyles.chartBg}`}
            style={{ backgroundColor: colors.chart.background, borderColor: colors.chart.border }}
          >
            <h3 className="text-lg font-medium mb-3 text-primary">Вайпауты</h3>
            <ResponsiveContainer width="100%" height="91%">
              <BarChart data={wipeoutsData} barGap={8} margin={{ top: 20 }}>
                <defs>
                  <linearGradient id="wipeoutGradient1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradient1[0]} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={colors.gradient1[1]} stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="wipeoutGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradient2[0]} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={colors.gradient2[1]} stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="wipeoutGradient3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.gradient3[0]} stopOpacity={0.95} />
                    <stop offset="95%" stopColor={colors.gradient3[1]} stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={colors.grid}
                  vertical={false}
                  opacity={0.6}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: colors.text, fontSize: 12 }}
                  axisLine={{ stroke: colors.grid }}
                  tickLine={{ stroke: colors.grid }}
                />
                <YAxis
                  tick={{ fill: colors.text, fontSize: 12 }}
                  axisLine={{ stroke: colors.grid }}
                  tickLine={{ stroke: colors.grid }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ opacity: 0.15 }} />
                <Bar dataKey="wipeouts" name="Вайпауты" radius={[5, 5, 0, 0]} maxBarSize={60}>
                  <LabelList dataKey="wipeouts" {...labelListProps} />
                  {wipeoutsData.map((entry, index) => {
                    let fillGradient;
                    let strokeColor;

                    if (entry.team === 1) {
                      fillGradient = 'url(#wipeoutGradient1)';
                      strokeColor = colors.team1;
                    } else if (entry.team === 2) {
                      fillGradient = 'url(#wipeoutGradient2)';
                      strokeColor = colors.team2;
                    } else if (entry.team === 3) {
                      fillGradient = 'url(#wipeoutGradient3)';
                      strokeColor = colors.team3;
                    }

                    return (
                      <Cell
                        key={`cell-wipeout-${index}`}
                        fill={fillGradient}
                        stroke={strokeColor}
                        strokeWidth={1}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div
            className={`h-80 p-4 rounded-lg border ${cardStyles.chartBorder} ${cardStyles.chartBg}`}
            style={{ backgroundColor: colors.chart.background, borderColor: colors.chart.border }}
          >
            <h3 className="text-lg font-medium mb-3 text-primary">Урон от мин</h3>
            <ResponsiveContainer width="100%" height="91%">
              <PieChart>
                <defs>
                  <linearGradient id="pieGradient1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.gradient1[0]} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={colors.gradient1[1]} stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="pieGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.gradient2[0]} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={colors.gradient2[1]} stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="pieGradient3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.gradient3[0]} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={colors.gradient3[1]} stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <Pie
                  data={
                    minesDamageData.length > 0
                      ? minesDamageData
                      : [{ name: 'Нет данных', value: 1, team: 0 }]
                  }
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={true}
                  paddingAngle={4}
                >
                  {minesDamageData.length > 0 ? (
                    minesDamageData.map((entry, index) => {
                      let fillGradient;
                      let strokeColor;

                      if (entry.team === 1) {
                        fillGradient = 'url(#pieGradient1)';
                        strokeColor = colors.team1;
                      } else if (entry.team === 2) {
                        fillGradient = 'url(#pieGradient2)';
                        strokeColor = colors.team2;
                      } else if (entry.team === 3) {
                        fillGradient = 'url(#pieGradient3)';
                        strokeColor = colors.team3;
                      } else {
                        fillGradient = '#94a3b8';
                        strokeColor = '#64748b';
                      }

                      return (
                        <Cell
                          key={`cell-mines-${index}`}
                          fill={fillGradient}
                          stroke={strokeColor}
                          strokeWidth={1}
                        />
                      );
                    })
                  ) : (
                    <Cell fill="#94a3b8" />
                  )}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
