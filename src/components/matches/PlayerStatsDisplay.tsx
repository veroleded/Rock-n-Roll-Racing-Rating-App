import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AlertTriangle, Bot, Coins, ShieldHalf, Target, Trophy, User } from 'lucide-react';
import React from 'react';
import { DamageDealt, MatchPlayer } from './types';

interface PlayerStatsDisplayProps {
  players: MatchPlayer[];
  sessionUserId?: string;
}

export const PlayerStatsDisplay: React.FC<PlayerStatsDisplayProps> = ({
  players,
  sessionUserId,
}) => {
  // Группируем игроков по командам
  const teams = players.reduce(
    (acc, player) => {
      if (!acc[player.team]) {
        acc[player.team] = [];
      }
      acc[player.team].push(player);
      return acc;
    },
    {} as Record<number, typeof players>
  );

  // Находим игрока с максимальным количеством вайпаутов
  const playerWithMaxWipeouts = players.reduce((maxPlayer, currentPlayer) => {
    return currentPlayer.wipeouts > (maxPlayer?.wipeouts || 0) ? currentPlayer : maxPlayer;
  }, players[0]);

  // Находим игрока с максимальным количеством очков
  const playerWithMaxScore = players.reduce((maxPlayer, currentPlayer) => {
    return currentPlayer.score > (maxPlayer?.score || 0) ? currentPlayer : maxPlayer;
  }, players[0]);

  return (
    <div className="w-full">
      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(teams).map(([teamId, teamPlayers]) => {
          // Считаем сумму очков команды
          const teamTotalScore = teamPlayers.reduce((sum, player) => sum + player.score, 0);
          const hasWin = teamPlayers.some((player) => player.result === 'WIN');

          return (
            <div key={teamId} className="space-y-2">
              {/* Заголовок команды с суммой очков */}
              <TeamScoreHeader
                teamName={`Команда ${parseInt(teamId)}`}
                totalScore={teamTotalScore}
                hasWin={hasWin}
              />

              <div className="grid grid-cols-1 gap-4">
                {teamPlayers.map((player) => (
                  <PlayerStatsCard
                    key={player.id}
                    player={player}
                    allPlayers={players}
                    isCurrentUser={player.userId === sessionUserId}
                    isTopWipeouts={
                      player.userId === playerWithMaxWipeouts.userId && player.wipeouts > 0
                    }
                    isTopScore={player.userId === playerWithMaxScore.userId && player.score > 0}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Компонент заголовка команды с общим счетом
const TeamScoreHeader: React.FC<{
  teamName: string;
  totalScore: number;
  hasWin: boolean;
}> = ({ teamName, totalScore, hasWin }) => {
  return (
    <div className="flex items-center justify-between px-2 py-[5px]">
      <h3 className="font-bold text-base">{teamName}</h3>
      <div className="flex items-center gap-2">
        <Trophy className={cn('h-4 w-4', hasWin ? 'text-yellow-500' : 'text-gray-400')} />
        <span className="font-bold text-lg">{totalScore}</span>
      </div>
    </div>
  );
};

const PlayerStatsCard: React.FC<{
  player: MatchPlayer;
  allPlayers: MatchPlayer[];
  isCurrentUser: boolean;
  isTopWipeouts?: boolean;
  isTopScore?: boolean;
}> = ({ player, allPlayers, isCurrentUser, isTopWipeouts = false, isTopScore = false }) => {
  // Отображаемые названия результатов
  const resultNames = {
    WIN: 'Победа',
    LOSS: 'Поражение',
    DRAW: 'Ничья',
  };

  // Рассчитываем общий урон, нанесенный по союзникам
  const totalAllyDamage = Object.values(player.damageDealt)
    .filter((info) => info.isAlly)
    .reduce((sum, info) => sum + info.damage, 0);

  // Есть ли урон по союзникам вообще
  const hasAllyDamage = totalAllyDamage > 0;

  return (
    <Card
      className="overflow-hidden border-2"
      style={{
        borderColor:
          player.result === 'WIN'
            ? 'rgb(74, 222, 128)'
            : player.result === 'LOSS'
              ? 'rgb(248, 113, 113)'
              : 'rgb(250, 204, 21)',
      }}
    >
      {/* Хедер с аватаром и именем */}
      <div
        className={cn(
          'p-1.5 flex items-center gap-1.5',
          player.result === 'WIN'
            ? 'bg-green-500/20'
            : player.result === 'LOSS'
              ? 'bg-red-500/20'
              : 'bg-yellow-500/20'
        )}
      >
        <div className="relative">
          {player.userId.startsWith('bot_') ? (
            <Avatar className="h-6 w-6">
              <AvatarFallback>
                <Bot className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-6 w-6">
              <AvatarImage src={player.user?.image || ''} />
              <AvatarFallback>
                <User className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3
              className={cn(
                'font-bold text-sm flex items-center truncate',
                isTopWipeouts && 'px-1.5 py-0.5 rounded border border-pink-400 bg-pink-400',
                isTopScore && 'px-1.5 py-0.5 rounded border border-primary bg-primary'
              )}
            >
              {player.userId.startsWith('bot_')
                ? player.userId.replace('bot_', '')
                : player.user?.name}
              {isCurrentUser && (
                <Badge variant="secondary" className="ml-1 text-[9px] py-0 h-4">
                  Вы
                </Badge>
              )}
            </h3>
            <Badge
              className={cn(
                'ml-1 text-[9px] py-0 h-4 whitespace-nowrap',
                player.result === 'WIN'
                  ? 'bg-green-500 hover:bg-green-500/90'
                  : player.result === 'LOSS'
                    ? 'bg-red-500 hover:bg-red-500/90'
                    : 'bg-yellow-500 hover:bg-yellow-500/90'
              )}
            >
              {resultNames[player.result]}
            </Badge>
          </div>
        </div>
      </div>

      <CardContent className="p-1.5">
        <div className="grid md:grid-cols-2 gap-1.5 h-full">
          {/* Колонка 1: Урон */}
          <div className="flex flex-col space-y-1.5">
            <div className="bg-muted/80 rounded-lg p-1">
              <div className="text-[9px] font-medium">Нанесенный урон</div>
              <div className="flex items-center gap-1 text-base font-bold">
                <Target className="h-3 w-3 text-red-400" />
                {player.totalDamageDealt}
              </div>
              {hasAllyDamage && (
                <div className="text-[9px] text-red-400 flex items-center">
                  <AlertTriangle className="h-2 w-2 mr-0.5" />
                  Урон по союзникам: {totalAllyDamage} (
                  {((totalAllyDamage / player.totalDamageDealt) * 100).toFixed(1)}%)
                </div>
              )}
            </div>

            <div className="flex-1">
              <PlayerDamageSection
                title="Урон по игрокам:"
                damageDealt={player.damageDealt}
                allPlayers={allPlayers}
              />
            </div>
          </div>

          {/* Колонка 2: Другая статистика (2x3 сетка) */}
          <div className="grid grid-cols-2 grid-rows-3 gap-1 h-full">
            <StatCard
              label="Очки"
              value={player.score}
              valueClassName={
                player.ratingChange > 0
                  ? 'text-green-500'
                  : player.ratingChange < 0
                    ? 'text-red-500'
                    : ''
              }
            />

            <StatCard
              label="Рейтинг"
              value={player.ratingChange}
              showSign={true}
              valueClassName={
                player.ratingChange > 0
                  ? 'text-green-500'
                  : player.ratingChange < 0
                    ? 'text-red-500'
                    : ''
              }
            />

            <StatCard
              label="Деньги"
              value={player.moneyTaken}
              icon={<Coins className="h-2.5 w-2.5 text-yellow-500" />}
              valueClassName="text-green-500"
              format={(val) => `$${val.toLocaleString()}00`}
            />

            <StatCard
              label="Аптечки"
              value={player.armorTaken}
              icon={<ShieldHalf className="h-2.5 w-2.5 text-blue-500" />}
            />

            <StatCard
              label="Вайпауты"
              value={player.wipeouts}
              icon={<AlertTriangle className="h-2.5 w-2.5 text-orange-500" />}
            />

            <StatCard
              label="Получено урона"
              value={player.totalDamageReceived}
              icon={<Target className="h-2.5 w-2.5 text-orange-500" />}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PlayerDamageSection: React.FC<{
  title: string;
  damageDealt: DamageDealt;
  allPlayers: MatchPlayer[];
}> = ({ title, damageDealt, allPlayers }) => {
  // Разделяем урон на урон по союзникам и урон по врагам
  const allyDamage = Object.entries(damageDealt)
    .filter(([, info]) => info.isAlly)
    .sort((a, b) => b[1].damage - a[1].damage)
    .slice(0, 3); // Максимум 3 союзника

  const enemyDamage = Object.entries(damageDealt)
    .filter(([, info]) => !info.isAlly)
    .sort((a, b) => b[1].damage - a[1].damage)
    .slice(0, 3); // Максимум 3 врага

  // Общее количество игроков, по которым наносился урон
  const totalPlayers = Object.keys(damageDealt).length;
  const displayedPlayers = allyDamage.length + enemyDamage.length;

  return (
    <div className="bg-muted/50 rounded-lg p-1 h-full flex flex-col">
      <h4 className="text-xs font-medium mb-1">{title}</h4>

      <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 flex-1">
        {/* Левая колонка - урон по врагам */}
        <div className="bg-green-500/10 rounded p-0.5 space-y-0.5">
          {enemyDamage.map(([targetId, damageInfo]) =>
            renderDamageEntry(targetId, damageInfo, allPlayers, false)
          )}
          {enemyDamage.length === 0 && (
            <div className="text-[9px] text-center text-muted-foreground py-0.5">Нет урона</div>
          )}
        </div>

        {/* Правая колонка - урон по союзникам */}
        <div className="bg-red-500/10 rounded p-0.5 space-y-0.5">
          {allyDamage.map(([targetId, damageInfo]) =>
            renderDamageEntry(targetId, damageInfo, allPlayers, true)
          )}
          {allyDamage.length === 0 && (
            <div className="text-[9px] text-center text-muted-foreground py-0.5">Нет урона</div>
          )}
        </div>

        {/* Если есть больше игроков, показываем общее количество */}
        {totalPlayers > displayedPlayers && (
          <div className="text-[9px] text-muted-foreground text-center col-span-2">
            + ещё {totalPlayers - displayedPlayers} игроков
          </div>
        )}
      </div>
    </div>
  );
};

// Вспомогательная функция для рендеринга записи об уроне
const renderDamageEntry = (
  targetId: string,
  damageInfo: { damage: number; isAlly: boolean },
  allPlayers: MatchPlayer[],
  isAllyColumn: boolean
) => {
  const targetPlayer = allPlayers.find((p) => p.userId === targetId);
  if (!targetPlayer) return null;

  const displayName = targetPlayer.userId.startsWith('bot_')
    ? targetPlayer.userId.replace('bot_', '')
    : targetPlayer.user?.name;

  return (
    <div
      key={targetId}
      className={cn(
        'flex justify-between items-center py-0.5 px-1.5 rounded text-[10px]',
        isAllyColumn ? 'bg-red-500/20 border-l-2 border-red-500' : 'bg-green-500/5'
      )}
    >
      <div className="flex items-center gap-1 truncate max-w-[65%]">
        <Avatar className="h-3.5 w-3.5">
          <AvatarImage
            src={targetPlayer.userId.startsWith('bot_') ? '' : targetPlayer.user?.image || ''}
          />
          <AvatarFallback>
            {targetPlayer.userId.startsWith('bot_') ? (
              <Bot className="h-1.5 w-1.5" />
            ) : (
              <User className="h-1.5 w-1.5" />
            )}
          </AvatarFallback>
        </Avatar>
        <span className="truncate font-medium text-[10px]">{displayName}</span>
      </div>
      <div className="flex items-center">
        <span className="font-bold tabular-nums text-[11px]">{damageInfo.damage}</span>
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
  valueClassName?: string;
  format?: (value: number) => string;
  showSign?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  valueClassName,
  format = (v) => v.toString(),
  showSign = false,
}) => {
  return (
    <div className="bg-muted rounded-lg p-1">
      <div className="font-medium text-[8px]">{label}</div>
      <div className={cn('flex items-center gap-0.5 font-bold', valueClassName)}>
        {icon}
        {showSign && value > 0 ? '+' : ''}
        {format(value)}
      </div>
    </div>
  );
};
