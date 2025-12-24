"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from "@/lib/utils";
import { createStatsDataSchema, type CreateStatsData } from '@/server/services/match/schemas';
import { trpc } from '@/utils/trpc';
import { zodResolver } from '@hookform/resolvers/zod';
import { GameMode } from '@prisma/client';
import { Bot, Check, ChevronsUpDown, Loader2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

function getTeamSize(mode: GameMode) {
  switch (mode) {
    case 'TWO_VS_TWO':
      return 2;
    case 'THREE_VS_THREE':
      return 3;
    case 'TWO_VS_TWO_VS_TWO':
      return 2;
    default:
      return 0;
  }
}

function getTeamCount(mode: GameMode) {
  switch (mode) {
    case 'TWO_VS_TWO':
      return 2;
    case 'THREE_VS_THREE':
      return 2;
    case 'TWO_VS_TWO_VS_TWO':
      return 3;
    default:
      return 0;
  }
}

const playerSchema = z.object({
  id: z.string().min(1, 'Выберите игрока или бота'),
  isBot: z.boolean().default(false),
  hasLeft: z.boolean().default(false),
});

const teamSchema = z.object({
  players: z.array(playerSchema).refine(
    (players) => {
      return players.some((player) => !player.isBot);
    },
    {
      message: 'В команде должен быть хотя бы один реальный игрок',
    }
  ),
});

const formSchema = z.object({
  mode: z.enum(['TWO_VS_TWO', 'THREE_VS_THREE', 'TWO_VS_TWO_VS_TWO'], {
    required_error: 'Выберите режим игры',
  }),
  statsData: createStatsDataSchema.optional(),
  teams: z.array(teamSchema).min(2, 'Добавьте как минимум две команды'),
  penaltyFactor: z.number().default(30),
  isTraining: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

type MatchFormProps = {
  editMatchId?: string;
};

export function MatchForm({ editMatchId }: MatchFormProps) {
  const router = useRouter();
  const { data: session } = trpc.auth.getSession.useQuery();
  const isAdmin = session?.user?.role === 'ADMIN';

  const {
    data: users = [],
    isLoading: isLoadingUsers,
    error: usersError,
  } = trpc.users.list.useQuery();

  const {
    data: bots = [],
    isLoading: isLoadingBots,
    error: botsError,
  } = trpc.users.botListForMAtch.useQuery();

  const { mutate: createMatch } = trpc.matches.create.useMutation({
    onSuccess: (match) => {
      router.push(`/matches/${match.id}`);
    },
    onError: (error) => {
      form.setError('root', {
        type: 'manual',
        message: error.message,
      });
    },
  });
  const { mutate: editMatch } = trpc.matches.edit.useMutation({
    onSuccess: (match) => {
      router.push(`/matches/${match.id}`);
    },
    onError: (error) => {
      form.setError('root', {
        type: 'manual',
        message: error.message,
      });
    },
  });

  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  const [statsData, setStatsData] = useState<CreateStatsData | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teams: [] as {
        players: {
          id: string;
          isBot: boolean;
          hasLeft: boolean;
        }[];
      }[],
      penaltyFactor: 30,
      isTraining: false,
    },
  });

  const mode = form.watch('mode') as GameMode | undefined;

  useEffect(() => {
    if (mode) {
      const teamCount = getTeamCount(mode);
      const teamSize = getTeamSize(mode);
      const teams = Array.from({ length: teamCount }, () => ({
        players: Array.from({ length: teamSize }, () => ({
          id: '',
          isBot: false,
          hasLeft: false,
        })),
      }));
      form.setValue('teams', teams);
    }
  }, [mode, form]);

  const getSelectedPlayers = (currentTeamIndex: number, currentPlayerIndex: number) => {
    const teams = form.getValues('teams');
    return teams
      .flatMap((team, teamIndex) =>
        team.players.map((player, playerIndex) => {
          // Пропускаем текущего игрока
          if (teamIndex === currentTeamIndex && playerIndex === currentPlayerIndex) {
            return null;
          }
          return player.id;
        })
      )
      .filter((id): id is string => id !== null && id !== '');
  };

  // Получаем список доступных игроков/ботов (исключая уже выбранных) + фильтр по поиску.
  const getAvailablePlayers = (teamIndex: number, playerIndex: number, searchTerm: string = '') => {
    const selectedPlayers = getSelectedPlayers(teamIndex, playerIndex);
    const filteredUsers = users.filter(
      (user) =>
        !selectedPlayers.includes(user.id) &&
        user.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredBots = bots.filter(
      (bot) =>
        !selectedPlayers.includes(bot.id) &&
        bot.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...filteredUsers, ...filteredBots];
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        const jsonData = JSON.parse(text);

        // Выделяем основные поля и дивизионы
        const {
          damage,
          scores,
          mines_damage,
          money_taken,
          armor_taken,
          wipeouts,
          total_score,
          ...divisions
        } = jsonData;

        const processedData = {
          damage,
          scores,
          mines_damage,
          money_taken,
          armor_taken,
          wipeouts,
          total_score,
          divisions,
        };

        const parsed = createStatsDataSchema.safeParse(processedData);
        if (!parsed.success) {
          const firstIssue = parsed.error.issues[0];
          const details = firstIssue
            ? ` (${firstIssue.path.join('.') || 'root'}: ${firstIssue.message})`
            : '';
          setStatsError(`Неверная структура файла статистики. Проверьте формат JSON${details}`);
          setStatsData(null);
          form.setValue('statsData', undefined);
          return;
        }

        setStatsData(parsed.data);
        setStatsError(null);
        form.setValue('statsData', parsed.data);
      } catch (error) {
        console.error('Ошибка при чтении файла:', error);
        setStatsError('Ошибка при чтении файла. Убедитесь, что это валидный JSON файл.');
        setStatsData(null);
        form.setValue('statsData', undefined);
      }
    } else {
      setStatsData(null);
      setStatsError(null);
      form.setValue('statsData', undefined);
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Проверяем, что все команды имеют нужное количество игроков
      const teamSize = getTeamSize(data.mode as GameMode);
      const hasInvalidTeams = data.teams.some((team) => team.players.length !== teamSize);

      if (hasInvalidTeams) {
        setSubmitError(`Каждая команда должна иметь ${teamSize} игрока(ов)`);
        return;
      }

      // Проверяем, что игроки не повторяются
      const playerIds = data.teams.flatMap((team) => team.players.map((player) => player.id));
      const uniquePlayerIds = new Set(playerIds);

      if (playerIds.length !== uniquePlayerIds.size) {
        setSubmitError('Один игрок не может быть в нескольких командах');
        return;
      }

      // Проверяем наличие реальных игроков в каждой команде
      const teamsWithoutRealPlayers = data.teams
        .map((team, index) => ({
          index: index + 1,
          hasRealPlayer: team.players.some((player) => !player.id.startsWith('bot_')),
        }))
        .filter((team) => !team.hasRealPlayer);

      if (teamsWithoutRealPlayers.length > 0) {
        setSubmitError(
          `В ${teamsWithoutRealPlayers
            .map((team) => `команде ${team.index}`)
            .join(', ')} должен быть хотя бы один реальный игрок`
        );
        return;
      }

      // Проверяем наличие файла статистики
      if (!statsData) {
        setSubmitError('Загрузите файл статистики матча');
        return;
      }

      // Преобразуем данные для отправки
      const players = data.teams.flatMap((team, teamIndex) =>
        team.players.map((player, playerIndex) => ({
          userId: player.id,
          team: teamIndex + 1,
          position: teamIndex * teamSize + playerIndex + 1,
          hasLeft: player.hasLeft,
        }))
      );

      // Отправляем данные на сервер
      if (editMatchId) {
        editMatch({
          mode: data.mode,
          players,
          statsData,
          penaltyFactor: data.penaltyFactor,
          isTraining: data.isTraining,
          editMatchId,
        });
      } else {
        createMatch({
          mode: data.mode,
          players,
          statsData,
          penaltyFactor: data.penaltyFactor,
          isTraining: data.isTraining,
        });
      }
    } catch (error) {
      console.error('Ошибка при отправке формы:', error);
      setSubmitError(
        error instanceof Error ? error.message : 'Произошла ошибка при сохранении матча'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPlayerSelect = (teamIndex: number, playerIndex: number) => {
    const popoverId = `team-${teamIndex}-player-${playerIndex}`;
    const searchTerm = searchTerms[popoverId] ?? '';
    const options = getAvailablePlayers(teamIndex, playerIndex, searchTerm);

    return (
      <FormField
        control={form.control}
        name={`teams.${teamIndex}.players.${playerIndex}.id`}
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormLabel className="text-base">Игрок {playerIndex + 1}</FormLabel>
            <Popover
              open={openPopover === popoverId}
              onOpenChange={(open) => {
                if (open) {
                  setOpenPopover(popoverId);
                } else {
                  setOpenPopover(null);
                  setSearchTerms((prev) => ({ ...prev, [popoverId]: '' }));
                }
              }}
            >
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {field.value ? (
                      <div className="flex items-center gap-2">
                        {field.value.startsWith('bot_') ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={users.find((user) => user.id === field.value)?.image || ''}
                              alt="Avatar"
                            />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span>
                          {field.value.startsWith('bot_') ? (
                            <span>
                              <span className="text-muted-foreground">[БОТ]</span>{' '}
                              {bots.find((bot) => bot.id === field.value)?.name ||
                                field.value.replace('bot_', '')}
                            </span>
                          ) : (
                            users.find((user) => user.id === field.value)?.name || 'Выберите игрока'
                          )}
                        </span>
                      </div>
                    ) : (
                      'Выберите игрока'
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <div className="flex flex-col">
                  <div className="flex items-center border-b p-2">
                    <input
                      className="flex h-9 w-full rounded-md border-0 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Поиск игрока..."
                      value={searchTerm}
                      onChange={(e) =>
                        setSearchTerms((prev) => ({ ...prev, [popoverId]: e.target.value }))
                      }
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {isLoadingUsers ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      <div className="flex flex-col py-2">
                        {options.map((player) => (
                          <button
                            type="button"
                            key={player.id}
                            className={cn(
                              'relative flex w-full cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                              field.value === player.id ? 'bg-accent text-accent-foreground' : ''
                            )}
                            onClick={() => {
                              form.setValue(
                                `teams.${teamIndex}.players.${playerIndex}.id`,
                                player.id
                              );
                              form.setValue(
                                `teams.${teamIndex}.players.${playerIndex}.isBot`,
                                player.id.startsWith('bot_')
                              );
                              setSearchTerms((prev) => ({ ...prev, [popoverId]: '' }));
                              setOpenPopover(null);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                field.value === player.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <div className="flex items-center gap-2">
                              {player.id.startsWith('bot_') ? (
                                <Bot className="h-4 w-4" />
                              ) : (
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={player.image || ''} alt="Avatar" />
                                  <AvatarFallback>
                                    <User className="h-4 w-4" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <span>
                                {player.id.startsWith('bot_') ? (
                                  <span>
                                    <span className="text-muted-foreground">[БОТ]</span>{' '}
                                    {player.name}
                                  </span>
                                ) : (
                                  player.name
                                )}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {!isLoadingUsers && options.length === 0 && (
                      <div className="p-4 text-sm text-muted-foreground">
                        {searchTerm
                          ? 'Нет игроков, соответствующих поиску'
                          : 'Нет доступных игроков'}
                      </div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  if (isLoadingUsers || isLoadingBots) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (usersError || !users || botsError || !bots) {
    return (
      <div className="flex items-center justify-center h-48 text-destructive">
        Ошибка загрузки списка игроков
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {submitError && (
          <div className="rounded-md bg-destructive/15 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-destructive">Ошибка при сохранении</h3>
                <div className="mt-2 text-sm text-destructive">{submitError}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6">
          <FormField
            control={form.control}
            name="mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Режим игры</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите режим игры" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="TWO_VS_TWO">2 на 2</SelectItem>
                    <SelectItem value="THREE_VS_THREE">3 на 3</SelectItem>
                    <SelectItem value="TWO_VS_TWO_VS_TWO">2 на 2 на 2</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {isAdmin && (
            <FormField
              control={form.control}
              name="penaltyFactor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Штрафной коэффициент</FormLabel>
                  <FormControl>
                    <input
                      type="number"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="isTraining"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-base font-normal cursor-pointer">
                  Тренировочная игра
                </FormLabel>
              </FormItem>
            )}
          />

          {mode && (
            <>
              <FormItem>
                <FormLabel className="text-base">Файл статистики</FormLabel>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    accept=".json"
                    required
                  />
                  {statsError && <div className="text-sm text-destructive">{statsError}</div>}
                  {statsData && !statsError && (
                    <div className="text-sm text-muted-foreground">Файл успешно загружен</div>
                  )}
                </div>
              </FormItem>

              <div className="grid gap-6">
                {form.watch('teams').map((team, teamIndex) => {
                  const hasRealPlayer = team.players.some(
                    (player) => player.id && !player.id.startsWith('bot_')
                  );

                  return (
                    <div
                      key={teamIndex}
                      className={cn(
                        'rounded-lg border p-4',
                        !hasRealPlayer && team.players.some((p) => p.id)
                          ? 'border-destructive'
                          : 'border-border'
                      )}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Команда {teamIndex + 1}</h3>
                        {!hasRealPlayer && team.players.some((p) => p.id) && (
                          <div className="text-sm text-destructive">
                            Необходим хотя бы один реальный игрок
                          </div>
                        )}
                      </div>
                      <div className="grid gap-4">
                        {team.players.map((_, playerIndex) => (
                          <div
                            key={playerIndex}
                            className="grid sm:grid-cols-[1fr,auto] gap-4 items-start"
                          >
                            {renderPlayerSelect(teamIndex, playerIndex)}
                            <FormField
                              control={form.control}
                              name={`teams.${teamIndex}.players.${playerIndex}.hasLeft`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-6">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal cursor-pointer">
                                    Покинул игру
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : editMatchId ? (
              'Изименить матч'
            ) : (
              'Добавить матч'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
