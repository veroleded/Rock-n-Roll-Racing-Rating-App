"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/utils/trpc";
import { GameMode, Role } from "@prisma/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Bot,
  Crown,
  Loader2,
  Swords,
  Target,
  Trash2,
  Trophy,
  User,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";

const gameModeNames = {
  TWO_VS_TWO: "2 на 2",
  THREE_VS_THREE: "3 на 3",
  TWO_VS_TWO_VS_TWO: "2 на 2 на 2",
};

const resultColors = {
  WIN: "bg-green-500",
  LOSS: "bg-red-500",
  DRAW: "bg-yellow-500",
};

const resultNames = {
  WIN: "Победа",
  LOSS: "Поражение",
  DRAW: "Ничья",
};

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const { data: session } = useSession();
  const { data: match, isLoading } = trpc.matches.byId.useQuery(
    params.id as string
  );

  const { mutate: deleteMatch, isLoading: isDeleting } =
    trpc.matches.delete.useMutation({
      onSuccess: () => {
        toast({
          title: "Матч удален",
          description: "Матч и вся связанная статистика были успешно удалены",
        });
        router.push("/matches");
      },
      onError: (error) => {
        toast({
          title: "Ошибка при удалении",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const canDelete =
    session?.user.role === Role.ADMIN || session?.user.role === Role.MODERATOR;

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
    if (
      window.confirm(
        "Вы уверены, что хотите удалить этот матч? Это действие нельзя отменить."
      )
    ) {
      deleteMatch(match.id);
    }
  };

  const scores = match.totalScore.split(" - ").map(Number);
  const teams = match.players.reduce((acc, player) => {
    if (!acc[player.team]) {
      acc[player.team] = [];
    }
    acc[player.team].push(player);
    return acc;
  }, {} as Record<number, typeof match.players>);

  return (
    <div className="container py-8 space-y-8">
      {/* Заголовок и основная информация */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Матч #{match.id}</h1>
            {canDelete && (
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
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <span>
              {format(new Date(match.createdAt), "d MMMM yyyy, HH:mm", {
                locale: ru,
              })}
            </span>
            <span>•</span>
            <span>{gameModeNames[match.mode as GameMode]}</span>
            {match.isRated && (
              <>
                <span>•</span>
                <Badge variant="secondary">Рейтинговый</Badge>
              </>
            )}
          </div>
        </div>
        <div className="text-4xl font-bold">{match.totalScore}</div>
      </div>

      {/* Команды */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(teams).map(([teamId, players]) => (
          <Card key={teamId} className="overflow-hidden">
            <CardHeader className="bg-muted">
              <CardTitle className="flex items-center justify-between">
                <span>Команда {teamId}</span>
                <span>{scores[parseInt(teamId) - 1]}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center gap-4">
                    {player.userId.startsWith("bot_") ? (
                      <div className="relative">
                        <Avatar>
                          <AvatarFallback>
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 bg-muted rounded-full p-1">
                          <Bot className="h-3 w-3" />
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={player.user.image || ""} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        {player.result === "WIN" && (
                          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                            <Crown className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {player.userId.startsWith("bot_")
                            ? player.userId.replace("bot_", "")
                            : player.user.name}
                          {player.userId === session?.user.id && (
                            <Badge variant="secondary" className="ml-2">
                              Вы
                            </Badge>
                          )}
                        </span>
                        <Badge
                          variant="secondary"
                          className={resultColors[player.result]}
                        >
                          {resultNames[player.result]}
                        </Badge>
                        {match.isRated && (
                          <Badge
                            variant="outline"
                            className={
                              player.ratingChange > 0
                                ? "text-green-500 border-green-500"
                                : "text-red-500 border-red-500"
                            }
                          >
                            {player.ratingChange > 0 ? "+" : ""}
                            {player.ratingChange} ELO
                          </Badge>
                        )}
                        {player.hasLeft && (
                          <Badge variant="destructive">Покинул игру</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          <span>{player.damage}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          <span>
                            {player.score} (
                            {Math.round(player.score / match.players.length)} за
                            игрока)
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Swords className="h-4 w-4" />
                          <span>{player.wipeouts}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Детальная статистика */}
      <Tabs defaultValue="damage" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="damage">Урон</TabsTrigger>
          <TabsTrigger value="divisions">Дивизионы</TabsTrigger>
          <TabsTrigger value="resources">Ресурсы</TabsTrigger>
          <TabsTrigger value="details">Детали</TabsTrigger>
        </TabsList>

        <TabsContent value="damage" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Нанесенный урон</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {match.players.map((player) => (
                  <div key={player.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={
                            player.userId.startsWith("bot_")
                              ? ""
                              : player.user.image || ""
                          }
                        />
                        <AvatarFallback>
                          {player.userId.startsWith("bot_") ? (
                            <Bot className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {player.userId.startsWith("bot_")
                          ? player.userId.replace("bot_", "")
                          : player.user.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(
                        player.damageDealt as Record<string, number>
                      ).map(([targetId, damage]) => {
                        const target = match.players.find(
                          (p) =>
                            p.position ===
                            parseInt(targetId.replace("player", ""))
                        );
                        if (!target) return null;
                        return (
                          <div
                            key={targetId}
                            className="flex items-center gap-2 p-2 rounded-lg bg-muted"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage
                                src={
                                  target.userId.startsWith("bot_")
                                    ? ""
                                    : target.user.image || ""
                                }
                              />
                              <AvatarFallback>
                                {target.userId.startsWith("bot_") ? (
                                  <Bot className="h-4 w-4" />
                                ) : (
                                  <User className="h-4 w-4" />
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                {target.userId.startsWith("bot_")
                                  ? target.userId.replace("bot_", "")
                                  : target.user.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {damage} урона
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Separator className="my-4" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="divisions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Дивизионы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {match.players.map((player) => (
                  <div key={player.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={
                            player.userId.startsWith("bot_")
                              ? ""
                              : player.user.image || ""
                          }
                        />
                        <AvatarFallback>
                          {player.userId.startsWith("bot_") ? (
                            <Bot className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {player.userId.startsWith("bot_")
                          ? player.userId.replace("bot_", "")
                          : player.user.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(
                        player.divisions as Record<string, number>
                      ).map(([division, score]) => (
                        <div key={division} className="p-2 rounded-lg bg-muted">
                          <div className="text-sm font-medium">{division}</div>
                          <div className="text-sm text-muted-foreground">
                            {score} очков
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-4" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ресурсы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {match.players.map((player) => (
                  <div key={player.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={
                            player.userId.startsWith("bot_")
                              ? ""
                              : player.user.image || ""
                          }
                        />
                        <AvatarFallback>
                          {player.userId.startsWith("bot_") ? (
                            <Bot className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {player.userId.startsWith("bot_")
                          ? player.userId.replace("bot_", "")
                          : player.user.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <div className="text-sm font-medium">Собрано денег</div>
                        <div className="text-sm text-muted-foreground">
                          {player.moneyTaken}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted">
                        <div className="text-sm font-medium">Собрано брони</div>
                        <div className="text-sm text-muted-foreground">
                          {player.armorTaken}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted">
                        <div className="text-sm font-medium">Урон от мин</div>
                        <div className="text-sm text-muted-foreground">
                          {player.minesDamage}
                        </div>
                      </div>
                    </div>
                    <Separator className="my-4" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
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
                      <AvatarImage src={match.creator.image || ""} />
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
                    {format(new Date(match.createdAt), "d MMMM yyyy, HH:mm", {
                      locale: ru,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Режим игры</div>
                  <div className="text-muted-foreground">
                    {gameModeNames[match.mode as GameMode]}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Тип матча</div>
                  <div className="text-muted-foreground">
                    {match.isRated ? "Рейтинговый" : "Обычный"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
