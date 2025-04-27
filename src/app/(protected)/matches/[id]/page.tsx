"use client";

import { BackButton } from "@/components/BackButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { trpc } from '@/utils/trpc';
import { GameMode, MatchResult, Role } from '@prisma/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Bot, Loader2, Shield, Trash2, User } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// Типы для JSON полей
type DamageDealt = Record<string, { isAlly: boolean; damage: number }>;
type DamageReceived = Record<string, { isAlly: boolean; damage: number }>;
type Divisions = Record<string, { scores: number; result: MatchResult }>;

const gameModeNames = {
  TWO_VS_TWO: '2 на 2',
  THREE_VS_THREE: '3 на 3',
  TWO_VS_TWO_VS_TWO: '2 на 2 на 2',
};

const resultNames = {
  WIN: 'Победа',
  LOSS: 'Поражение',
  DRAW: 'Ничья',
};

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const { data: session } = useSession();
  const { data: match, isLoading } = trpc.matches.byId.useQuery(params.id as string, {
    // Отключаем автоматическое обновление данных при фокусе на странице
    refetchOnWindowFocus: false,
    // Не пытаемся перезагружать данные при ошибке
    retry: false,
    // Обрабатываем ошибку, если матч не найден
    onError: (error) => {
      if (error.data?.code === 'NOT_FOUND') {
        router.push('/matches');
      }
    },
  });

  console.dir(match, { depth: 5 });

  const { mutate: deleteMatch, isLoading: isDeleting } = trpc.matches.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Матч удален',
        description: 'Матч и вся связанная статистика были успешно удалены',
      });
      // Немедленно перенаправляем на страницу со списком матчей
      router.push('/matches');
    },
    onError: (error) => {
      toast({
        title: 'Ошибка при удалении',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const canChange =
    session?.user.role === Role.ADMIN || (session?.user.role === Role.MODERATOR && match?.isLast);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-4xl font-bold">Матч не найден</h1>
        <p className="text-muted-foreground">
          Возможно, он был удален или у вас нет к нему доступа
        </p>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить этот матч? Это действие нельзя отменить.')) {
      deleteMatch(match.id);
    }
  };

  const scores = match.totalScore.split(' - ').map(Number);
  const teams = match.players.reduce(
    (acc, player) => {
      if (!acc[player.team]) {
        acc[player.team] = [];
      }
      acc[player.team].push(player);
      return acc;
    },
    {} as Record<number, typeof match.players>
  );

  return (
    <div className="container py-8 space-y-8">
      {/* Заголовок и основная информация */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-3xl font-bold">Матч #{match.id}</h1>
            {canChange && (
              <>
                <Button size="sm">
                  <Link
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    href={`${match.id}/edit`}
                  >
                    Изменить
                  </Link>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="ml-2">Удалить матч</span>
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <span>
              {format(new Date(match.createdAt), 'd MMMM yyyy, HH:mm', {
                locale: ru,
              })}
            </span>
            <span>•</span>
            <span>{gameModeNames[match.mode as GameMode]}</span>
            {match.isRated && (
              <>
                <span>•</span>
                <Badge variant="secondary">
                  <Shield className="w-3 h-3 mr-1" />
                  Рейтинговый
                </Badge>
              </>
            )}
          </div>
        </div>
        <div className="text-4xl font-bold">{match.totalScore}</div>
      </div>

      {/* Сводка матча */}
      <Card>
        <CardHeader>
          <CardTitle>Детали матча</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">Создатель</div>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={match.creator.image || ''} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span>{match.creator.name}</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Дата создания</div>
              <div className="text-muted-foreground">
                {format(new Date(match.createdAt), 'd MMMM yyyy, HH:mm', {
                  locale: ru,
                })}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Режим игры</div>
              <div className="text-muted-foreground">{gameModeNames[match.mode as GameMode]}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Тип матча</div>
              <div className="text-muted-foreground">
                {match.isRated ? 'Рейтинговый' : 'Обычный'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Таблица статистики игроков */}
      {Object.entries(teams).map(([teamId, players], teamIndex) => (
        <Card key={`team-${teamId}`} className={cn(teamIndex > 0 ? 'mt-8' : '')}>
          <CardHeader
            className={cn(
              'pb-3',
              players[0]?.result === 'WIN'
                ? 'bg-green-500/10'
                : players[0]?.result === 'LOSS'
                  ? 'bg-red-500/10'
                  : 'bg-yellow-500/10'
            )}
          >
            <CardTitle className="flex items-center gap-2">
              <span>Команда {teamId}</span>
              <Badge
                className={cn(
                  'dark:text-gray-50',
                  players[0]?.result === 'WIN'
                    ? 'bg-green-500 hover:bg-green-500'
                    : players[0]?.result === 'LOSS'
                      ? 'bg-red-500 hover:bg-red-500'
                      : 'bg-yellow-500 hover:bg-yellow-500'
                )}
              >
                {resultNames[players[0]?.result]}
              </Badge>
              <span className="text-muted-foreground ml-2">
                {scores[parseInt(teamId) - 1]} очков
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-hidden rounded-b-lg">
              <div
                className="overflow-auto max-h-[600px]"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent',
                }}
              >
                <div
                  className="overflow-x-auto min-w-full"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent',
                  }}
                >
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/80">
                        <th className="text-left text-sm font-semibold p-3 pl-6 sticky left-0 bg-muted/80 shadow-sm z-20">
                          Игрок
                        </th>

                        {/* Основная статистика */}
                        <th className="text-center text-sm font-semibold p-3 whitespace-nowrap border-l border-muted/50">
                          ELO
                        </th>
                        <th className="text-center text-sm font-semibold p-3 whitespace-nowrap">
                          Деньги
                        </th>
                        <th className="text-center text-sm font-semibold p-3 whitespace-nowrap">
                          Броня
                        </th>
                        <th className="text-center text-sm font-semibold p-3 whitespace-nowrap">
                          Мины
                        </th>
                        <th className="text-center text-sm font-semibold p-3 whitespace-nowrap">
                          Вылеты
                        </th>

                        {/* Столбик с суммой очков дивизионов */}
                        <th className="text-center text-sm font-semibold p-3 whitespace-nowrap border-l border-muted">
                          <span>Сумма очков</span>
                        </th>

                        {/* Найдем все дивизионы для заголовков */}
                        {(() => {
                          const allDivisions = new Set<string>();
                          players.forEach((player) => {
                            const divisions = player.divisions as Divisions;
                            if (divisions) {
                              Object.keys(divisions).forEach((div) => allDivisions.add(div));
                            }
                          });
                          return Array.from(allDivisions).map((division) => (
                            <th
                              key={`division-${division}`}
                              className="text-center text-sm font-semibold p-2 whitespace-nowrap border-l border-muted/50"
                            >
                              <span>{division}</span>
                            </th>
                          ));
                        })()}

                        {/* Общие показатели урона */}
                        <th className="text-center text-sm font-semibold p-3 whitespace-nowrap border-l border-muted">
                          Урон нанесен
                        </th>
                        <th className="text-center text-sm font-semibold p-3 whitespace-nowrap">
                          Урон получен
                        </th>

                        {/* Заголовок секции урона */}
                        <th
                          colSpan={match.players.length}
                          className="text-center text-sm font-semibold p-2 whitespace-nowrap bg-red-500/10 border-l border-muted"
                        >
                          <span>Нанесенный урон по игрокам</span>
                        </th>

                        {/* Заголовок секции полученного урона */}
                        <th
                          colSpan={match.players.length}
                          className="text-center text-sm font-semibold p-2 whitespace-nowrap bg-orange-500/10 border-l border-muted"
                        >
                          <span>Полученный урон от игроков</span>
                        </th>
                      </tr>

                      {/* Подзаголовки для игроков в секциях урона */}
                      <tr className="border-b bg-muted/50">
                        <th className="text-left text-sm font-semibold p-3 pl-6 sticky left-0 bg-muted/50 shadow-sm z-20"></th>
                        <th
                          colSpan={
                            5 +
                            Array.from(
                              new Set(players.flatMap((p) => Object.keys(p.divisions as Divisions)))
                            ).length +
                            2
                          }
                          className="p-0 border-b-0"
                        ></th>

                        {/* Подзаголовки для нанесенного урона */}
                        {match.players.map((targetPlayer) => (
                          <th
                            key={`damage-header-to-${targetPlayer.id}`}
                            className="text-center text-xs font-medium p-1 bg-red-500/10 border-r border-muted/30"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Avatar className="h-5 w-5">
                                {targetPlayer.userId.startsWith('bot_') ? (
                                  <AvatarFallback>
                                    <Bot className="h-3 w-3" />
                                  </AvatarFallback>
                                ) : (
                                  <>
                                    <AvatarImage src={targetPlayer.user.image || ''} />
                                    <AvatarFallback>
                                      <User className="h-3 w-3" />
                                    </AvatarFallback>
                                  </>
                                )}
                              </Avatar>
                              <span className="text-[10px] leading-tight font-medium truncate max-w-[60px]">
                                {targetPlayer.userId.startsWith('bot_')
                                  ? targetPlayer.userId.replace('bot_', '')
                                  : targetPlayer.user.name}
                              </span>
                            </div>
                          </th>
                        ))}

                        {/* Подзаголовки для полученного урона */}
                        {match.players.map((sourcePlayer) => (
                          <th
                            key={`damage-header-from-${sourcePlayer.id}`}
                            className="text-center text-xs font-medium p-1 bg-orange-500/10 border-r border-muted/30"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Avatar className="h-5 w-5">
                                {sourcePlayer.userId.startsWith('bot_') ? (
                                  <AvatarFallback>
                                    <Bot className="h-3 w-3" />
                                  </AvatarFallback>
                                ) : (
                                  <>
                                    <AvatarImage src={sourcePlayer.user.image || ''} />
                                    <AvatarFallback>
                                      <User className="h-3 w-3" />
                                    </AvatarFallback>
                                  </>
                                )}
                              </Avatar>
                              <span className="text-[10px] leading-tight font-medium truncate max-w-[60px]">
                                {sourcePlayer.userId.startsWith('bot_')
                                  ? sourcePlayer.userId.replace('bot_', '')
                                  : sourcePlayer.user.name}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((player) => {
                        // Приведение типов JSON полей
                        const typedPlayer = {
                          ...player,
                          damageDealt: player.damageDealt as DamageDealt,
                          damageReceived: player.damageReceived as DamageReceived,
                          divisions: player.divisions as Divisions,
                        };

                        // Рассчитаем сумму очков дивизионов
                        const totalDivisionScore = Object.values(typedPlayer.divisions).reduce(
                          (sum, division) => sum + division.scores,
                          0
                        );

                        // Получим все дивизионы для этой команды
                        const teamDivisions = new Set<string>();
                        players.forEach((p) => {
                          const divisions = p.divisions as Divisions;
                          if (divisions) {
                            Object.keys(divisions).forEach((div) => teamDivisions.add(div));
                          }
                        });

                        return (
                          <tr
                            key={player.id}
                            className={cn(
                              'border-t border-muted/50 hover:bg-muted/20 transition-colors',
                              player.userId === session?.user.id && 'bg-primary/5'
                            )}
                          >
                            <td className="p-3 pl-6 sticky left-0 bg-background shadow-sm z-10">
                              <div className="flex items-center gap-3">
                                {player.userId.startsWith('bot_') ? (
                                  <div className="relative">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback>
                                        <Bot className="h-4 w-4" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-1 -right-1 bg-muted rounded-full p-1">
                                      <Bot className="h-3 w-3" />
                                    </div>
                                  </div>
                                ) : (
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={player.user.image || ''} />
                                    <AvatarFallback>
                                      <User className="h-4 w-4" />
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {player.userId.startsWith('bot_') ? (
                                      player.userId.replace('bot_', '')
                                    ) : (
                                      <Link
                                        href={`/users/${player.userId}`}
                                        className="hover:underline"
                                      >
                                        {player.user.name}
                                      </Link>
                                    )}
                                    {player.userId === session?.user.id && (
                                      <Badge variant="secondary" className="ml-1 text-xs">
                                        Вы
                                      </Badge>
                                    )}
                                    {player.hasLeft && (
                                      <Badge variant="destructive" className="ml-1 text-xs">
                                        Покинул
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    <Badge
                                      className={cn(
                                        'text-xs',
                                        player.result === 'WIN'
                                          ? 'bg-green-500'
                                          : player.result === 'LOSS'
                                            ? 'bg-red-500'
                                            : 'bg-yellow-500'
                                      )}
                                    >
                                      {resultNames[player.result]}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Основная статистика */}
                            <td className="p-3 text-center border-l border-muted/50">
                              {match.isRated && !player.userId.startsWith('bot_') ? (
                                <span
                                  className={cn(
                                    'font-medium',
                                    player.ratingChange > 0
                                      ? 'text-green-500'
                                      : player.ratingChange < 0
                                        ? 'text-red-500'
                                        : 'text-yellow-500'
                                  )}
                                >
                                  {player.ratingChange > 0 ? '+' : ''}
                                  {player.ratingChange}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span className="font-medium">{player.moneyTaken}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="font-medium">{player.armorTaken}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="font-medium">{player.minesDamage}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="font-medium">{player.wipeouts}</span>
                            </td>

                            {/* Сумма очков дивизионов */}
                            <td className="p-3 text-center font-semibold border-l border-muted">
                              {totalDivisionScore}
                            </td>

                            {/* Очки по каждому дивизиону */}
                            {Array.from(teamDivisions).map((division) => {
                              const divisionInfo = typedPlayer.divisions[division];
                              return (
                                <td
                                  key={`division-${division}`}
                                  className="p-1 text-center border-l border-muted/50"
                                >
                                  {divisionInfo ? (
                                    <div
                                      className={cn(
                                        'rounded p-1',
                                        divisionInfo.result === 'WIN'
                                          ? 'bg-green-500/10 border border-green-500'
                                          : divisionInfo.result === 'LOSS'
                                            ? 'bg-red-500/10 border border-red-500'
                                            : 'bg-yellow-500/10 border border-yellow-500'
                                      )}
                                    >
                                      <span className="font-medium">{divisionInfo.scores}</span>
                                      <div className="text-xs">
                                        <Badge
                                          className={cn(
                                            'text-xs',
                                            divisionInfo.result === 'WIN'
                                              ? 'bg-green-500'
                                              : divisionInfo.result === 'LOSS'
                                                ? 'bg-red-500'
                                                : 'bg-yellow-500'
                                          )}
                                        >
                                          {resultNames[divisionInfo.result]}
                                        </Badge>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Общий урон */}
                            <td className="p-3 text-center font-semibold border-l border-muted">
                              <span>{player.totalDamageDealt}</span>
                            </td>
                            <td className="p-3 text-center font-semibold">
                              <span>{player.totalDamageReceived}</span>
                            </td>

                            {/* Урон по каждому игроку */}
                            {match.players.map((targetPlayer) => {
                              const damageInfo = typedPlayer.damageDealt[targetPlayer.userId];
                              return (
                                <td
                                  key={`damage-to-${targetPlayer.id}`}
                                  className="p-1 text-center border-l border-r border-muted/30 bg-red-500/5"
                                >
                                  {damageInfo ? (
                                    <div
                                      className={cn(
                                        'rounded px-2 py-1',
                                        damageInfo.isAlly
                                          ? 'bg-destructive/10 border border-destructive'
                                          : damageInfo.damage > 0
                                            ? 'bg-muted/80'
                                            : ''
                                      )}
                                    >
                                      <span className="font-medium">{damageInfo.damage}</span>
                                      {damageInfo.isAlly && (
                                        <div className="text-[10px] text-destructive">Союзник</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Урон, полученный от каждого игрока */}
                            {match.players.map((sourcePlayer) => {
                              const damageInfo = typedPlayer.damageReceived[sourcePlayer.userId];
                              return (
                                <td
                                  key={`damage-from-${sourcePlayer.id}`}
                                  className="p-1 text-center border-r border-muted/30 bg-orange-500/5"
                                >
                                  {damageInfo ? (
                                    <div
                                      className={cn(
                                        'rounded px-2 py-1',
                                        damageInfo.isAlly
                                          ? 'bg-destructive/10 border border-destructive'
                                          : damageInfo.damage > 0
                                            ? 'bg-muted/80'
                                            : ''
                                      )}
                                    >
                                      <span className="font-medium">{damageInfo.damage}</span>
                                      {damageInfo.isAlly && (
                                        <div className="text-[10px] text-destructive">Союзник</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
