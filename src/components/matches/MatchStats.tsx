import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from 'next-themes';
import React from 'react';
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

// Цветовая схема
const COLORS = {
  light: {
    team1: '#1e40af', // темно-синий
    team2: '#b91c1c', // темно-красный
    gradient1: ['#3b82f6', '#1e40af'], // градиент для синей команды (светлее -> темнее)
    gradient2: ['#ef4444', '#b91c1c'], // градиент для красной команды (светлее -> темнее)
    text: '#0f172a', // темно-синий текст
    grid: '#e2e8f0', // светло-серая сетка
    labelText: '#0f172a', // цвет текста для меток
    tooltip: {
      background: 'rgba(255, 255, 255, 0.98)',
      border: '#e2e8f0',
      shadow: '0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
    },
    chart: {
      background: 'rgba(248, 250, 252, 0.8)',
      border: '#e2e8f0',
    },
  },
  dark: {
    team1: '#3b82f6', // синий
    team2: '#ef4444', // красный
    gradient1: ['#60a5fa', '#2563eb'], // градиент для синей команды (светлее -> темнее)
    gradient2: ['#f87171', '#dc2626'], // градиент для красной команды (светлее -> темнее)
    text: '#f1f5f9', // светло-серый текст
    grid: '#334155', // темно-серая сетка
    labelText: '#f8fafc', // цвет текста для меток
    tooltip: {
      background: 'rgba(15, 23, 42, 0.98)',
      border: '#334155',
      shadow: '0 4px 8px rgba(0, 0, 0, 0.16), 0 2px 4px rgba(0, 0, 0, 0.12)',
    },
    chart: {
      background: 'rgba(15, 23, 42, 0.7)',
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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const theme = isDark ? 'dark' : 'light';
  const colors = COLORS[theme];

  // Сортируем игроков по командам, чтобы союзники были рядом
  const sortedPlayers = [...players].sort((a, b) => a.team - b.team);

  // Улучшенные стили для карточки
  const cardStyles = {
    headerBg: 'bg-primary/10',
    shadow: isDark ? 'shadow-md shadow-primary/5' : 'shadow-lg shadow-primary/10',
    border: isDark ? 'border-slate-800' : 'border-slate-200',
    chartBg: isDark ? 'bg-slate-900/50' : 'bg-slate-50/80',
    chartBorder: isDark ? 'border-slate-800' : 'border-slate-200',
  };

  // Подготовка данных для графика урона
  const damageData = sortedPlayers.map((player) => ({
    name: player.user.name || 'Игрок',
    damage: player.totalDamageDealt,
    team: player.team,
  }));

  // Подготовка данных для графика полученного урона
  const damageTakenData = sortedPlayers.map((player) => ({
    name: player.user.name || 'Игрок',
    damage: player.totalDamageReceived,
    team: player.team,
  }));

  // Подготовка данных для графика собранных денег
  const moneyData = sortedPlayers.map((player) => ({
    name: player.user.name || 'Игрок',
    money: player.moneyTaken,
    team: player.team,
  }));

  // Подготовка данных для графика собранной брони
  const armorData = sortedPlayers.map((player) => ({
    name: player.user.name || 'Игрок',
    armor: player.armorTaken,
    team: player.team,
  }));

  // Подготовка данных для графика вайпаутов
  const wipeoutsData = sortedPlayers.map((player) => ({
    name: player.user.name || 'Игрок',
    wipeouts: player.wipeouts,
    team: player.team,
  }));

  // Подготовка данных для круговой диаграммы урона от мин
  const minesDamageData = sortedPlayers
    .map((player) => ({
      name: player.user.name || 'Игрок',
      value: player.minesDamage,
      team: player.team,
    }))
    .filter((item) => item.value > 0);

  // Кастомный компонент для тултипа
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const teamColor = payload[0].payload.team === 1 ? colors.team1 : colors.team2;
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

  // Общие настройки для меток
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
          {/* График нанесенного урона */}
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
                  {damageData.map((entry, index) => (
                    <Cell
                      key={`cell-dmg-${index}`}
                      fill={entry.team === 1 ? 'url(#damageGradient1)' : 'url(#damageGradient2)'}
                      stroke={entry.team === 1 ? colors.team1 : colors.team2}
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* График полученного урона */}
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
                  {damageTakenData.map((entry, index) => (
                    <Cell
                      key={`cell-taken-${index}`}
                      fill={entry.team === 1 ? 'url(#takenGradient1)' : 'url(#takenGradient2)'}
                      stroke={entry.team === 1 ? colors.team1 : colors.team2}
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* График собранных денег */}
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
                  {moneyData.map((entry, index) => (
                    <Cell
                      key={`cell-money-${index}`}
                      fill={entry.team === 1 ? 'url(#moneyGradient1)' : 'url(#moneyGradient2)'}
                      stroke={entry.team === 1 ? colors.team1 : colors.team2}
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* График собранной брони */}
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
                  {armorData.map((entry, index) => (
                    <Cell
                      key={`cell-armor-${index}`}
                      fill={entry.team === 1 ? 'url(#armorGradient1)' : 'url(#armorGradient2)'}
                      stroke={entry.team === 1 ? colors.team1 : colors.team2}
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* График вайпаутов */}
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
                  {wipeoutsData.map((entry, index) => (
                    <Cell
                      key={`cell-wipeout-${index}`}
                      fill={entry.team === 1 ? 'url(#wipeoutGradient1)' : 'url(#wipeoutGradient2)'}
                      stroke={entry.team === 1 ? colors.team1 : colors.team2}
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Круговая диаграмма урона от мин */}
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
                    minesDamageData.map((entry, index) => (
                      <Cell
                        key={`cell-mines-${index}`}
                        fill={entry.team === 1 ? 'url(#pieGradient1)' : 'url(#pieGradient2)'}
                        stroke={entry.team === 1 ? colors.team1 : colors.team2}
                        strokeWidth={1}
                      />
                    ))
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
