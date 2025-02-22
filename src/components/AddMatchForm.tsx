"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { GameMode } from "@prisma/client";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  mode: z.enum(["TWO_VS_TWO", "THREE_VS_THREE", "TWO_VS_TWO_VS_TWO"], {
    required_error: "Выберите режим игры",
  }),
  gameFile: z
    .string({
      required_error: "Загрузите файл игры",
    })
    .min(1, "Загрузите файл игры"),
  teams: z
    .array(
      z.object({
        players: z
          .array(
            z.object({
              id: z
                .string({
                  required_error: "Выберите игрока",
                })
                .min(1, "Выберите игрока"),
              hasLeft: z.boolean().default(false),
            })
          )
          .min(1, "Добавьте хотя бы одного игрока в команду"),
      })
    )
    .min(2, "Добавьте как минимум две команды"),
});

type FormValues = z.infer<typeof formSchema>;

export function AddMatchForm() {
  const {
    data: users = [],
    isLoading: isLoadingUsers,
    error: usersError,
  } = trpc.users.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teams: [],
    },
  });

  const mode = form.watch("mode") as GameMode | undefined;

  useEffect(() => {
    if (mode) {
      const teamCount = getTeamCount(mode);
      const teamSize = getTeamSize(mode);
      const teams = Array.from({ length: teamCount }, () => ({
        players: Array.from({ length: teamSize }, () => ({
          id: "",
          hasLeft: false,
        })),
      }));
      form.setValue("teams", teams);
    }
  }, [mode, form]);

  const getTeamSize = (mode: GameMode) => {
    switch (mode) {
      case "TWO_VS_TWO":
        return 2;
      case "THREE_VS_THREE":
        return 3;
      case "TWO_VS_TWO_VS_TWO":
        return 2;
      default:
        return 0;
    }
  };

  const getTeamCount = (mode: GameMode) => {
    switch (mode) {
      case "TWO_VS_TWO":
        return 2;
      case "THREE_VS_THREE":
        return 2;
      case "TWO_VS_TWO_VS_TWO":
        return 3;
      default:
        return 0;
    }
  };

  // Добавляем функцию для получения списка уже выбранных игроков
  const getSelectedPlayers = (
    currentTeamIndex: number,
    currentPlayerIndex: number
  ) => {
    const teams = form.getValues("teams");
    return teams
      .flatMap((team, teamIndex) =>
        team.players.map((player, playerIndex) => {
          // Пропускаем текущего игрока
          if (
            teamIndex === currentTeamIndex &&
            playerIndex === currentPlayerIndex
          ) {
            return null;
          }
          return player.id;
        })
      )
      .filter((id): id is string => id !== null && id !== "");
  };

  // Добавляем функцию для фильтрации доступных игроков
  const getAvailablePlayers = (
    teamIndex: number,
    playerIndex: number,
    searchTerm: string = ""
  ) => {
    const selectedPlayers = getSelectedPlayers(teamIndex, playerIndex);
    return users.filter(
      (user) =>
        !selectedPlayers.includes(user.id) &&
        user.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Проверяем, что все команды имеют нужное количество игроков
      const teamSize = getTeamSize(data.mode as GameMode);
      const hasInvalidTeams = data.teams.some(
        (team) => team.players.length !== teamSize
      );

      if (hasInvalidTeams) {
        setSubmitError(`Каждая команда должна иметь ${teamSize} игрока(ов)`);
        return;
      }

      // Проверяем, что игроки не повторяются
      const playerIds = data.teams.flatMap((team) =>
        team.players.map((player) => player.id)
      );
      const uniquePlayerIds = new Set(playerIds);

      if (playerIds.length !== uniquePlayerIds.size) {
        setSubmitError("Один игрок не может быть в нескольких командах");
        return;
      }

      console.log("Отправка данных:", data);
      // TODO: Добавить обработку данных и отправку на сервер
    } catch (error) {
      console.error("Ошибка при отправке формы:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Произошла ошибка при сохранении матча"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingUsers) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (usersError || !users) {
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
                <svg
                  className="h-5 w-5 text-destructive"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-destructive">
                  Ошибка при сохранении
                </h3>
                <div className="mt-2 text-sm text-destructive">
                  {submitError}
                </div>
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите режим игры" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="TWO_VS_TWO">2 на 2</SelectItem>
                    <SelectItem value="THREE_VS_THREE">3 на 3</SelectItem>
                    <SelectItem value="TWO_VS_TWO_VS_TWO">
                      2 на 2 на 2
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode && (
            <>
              <FormField
                control={form.control}
                name="gameFile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Файл игры</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              field.onChange(file.name);
                            } else {
                              field.onChange("");
                            }
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          accept=".json"
                          required
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6">
                {form.watch("teams").map((team, teamIndex) => (
                  <div
                    key={teamIndex}
                    className="rounded-lg border border-border p-4"
                  >
                    <h3 className="text-lg font-semibold mb-4">
                      Команда {teamIndex + 1}
                    </h3>
                    <div className="grid gap-4">
                      {team.players.map((_, playerIndex) => (
                        <div
                          key={playerIndex}
                          className="grid sm:grid-cols-[1fr,auto] gap-4 items-center"
                        >
                          <FormField
                            control={form.control}
                            name={`teams.${teamIndex}.players.${playerIndex}.id`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel className="text-base">
                                  Игрок {playerIndex + 1}
                                </FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between"
                                      >
                                        {field.value
                                          ? users.find(
                                              (user) => user.id === field.value
                                            )?.name
                                          : "Выберите игрока"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-[300px] p-0"
                                    align="start"
                                  >
                                    <div className="flex flex-col">
                                      <div className="flex items-center border-b p-2">
                                        <input
                                          className="flex h-9 w-full rounded-md border-0 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                                          placeholder="Поиск игрока..."
                                          value={searchTerm}
                                          onChange={(e) =>
                                            setSearchTerm(e.target.value)
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
                                            {getAvailablePlayers(
                                              teamIndex,
                                              playerIndex,
                                              searchTerm
                                            ).map((user) => (
                                              <button
                                                type="button"
                                                key={user.id}
                                                className={cn(
                                                  "relative flex w-full cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                                  field.value === user.id
                                                    ? "bg-accent text-accent-foreground"
                                                    : ""
                                                )}
                                                onClick={() => {
                                                  form.setValue(
                                                    `teams.${teamIndex}.players.${playerIndex}.id`,
                                                    user.id
                                                  );
                                                  setSearchTerm("");
                                                }}
                                              >
                                                <Check
                                                  className={cn(
                                                    "mr-2 h-4 w-4",
                                                    field.value === user.id
                                                      ? "opacity-100"
                                                      : "opacity-0"
                                                  )}
                                                />
                                                {user.name}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                        {!isLoadingUsers &&
                                          getAvailablePlayers(
                                            teamIndex,
                                            playerIndex,
                                            searchTerm
                                          ).length === 0 && (
                                            <div className="p-4 text-sm text-muted-foreground">
                                              {searchTerm
                                                ? "Нет игроков, соответствующих поиску"
                                                : "Нет доступных игроков"}
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
                ))}
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
            ) : (
              "Добавить матч"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
