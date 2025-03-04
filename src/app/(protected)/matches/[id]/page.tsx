"use client";

import { BackButton } from "@/components/BackButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import { GameMode, MatchResult, Role } from "@prisma/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bomb,
  Bot,
  ChevronDown,
  Coins,
  Loader2,
  Shield,
  ShieldHalf,
  Target,
  Trash2,
  User,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

// Типы для JSON полей
type DamageDealt = Record<string, { isAlly: boolean; damage: number; }>;
type DamageReceived = Record<string, { isAlly: boolean; damage: number; }>;
type Divisions = Record<string, { scores: number; result: MatchResult; }>;

const gameModeNames = {
  TWO_VS_TWO: "2 на 2",
  THREE_VS_THREE: "3 на 3",
  TWO_VS_TWO_VS_TWO: "2 на 2 на 2",
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
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const { data: session } = useSession();
  const { data: match, isLoading } = trpc.matches.byId.useQuery(
    params.id as string
  );

  console.dir(match);

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
            <BackButton />
            <h1 className="text-3xl font-bold">Матч #{match.id}</h1>
            {canDelete && (
              <>
                <Button size='sm'>
                  <Link onClick={(e) => { e.stopPropagation(); }} href={`${match.id}/edit`}>Изменить</Link>
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
              {format(new Date(match.createdAt), "d MMMM yyyy, HH:mm", {
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

      {/* Команды */}
      <div className="relative">
        <motion.div
          className={cn(
            "grid",
            Object.keys(teams).length === 3
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : Object.keys(teams).length === 2
              ? "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8"
              : "grid-cols-1 max-w-lg mx-auto gap-4"
          )}
        >
          {Object.entries(teams).map(([teamId, players]) => {
            const teamResult = players[0]?.result;
            const isExpanded = expandedTeam === teamId;

            return (
              <div key={teamId} className="relative">
                <Card
                  className={cn(
                    "overflow-hidden border-2 cursor-pointer transition-all duration-300",
                    teamResult === "WIN"
                      ? "border-green-500"
                      : teamResult === "LOSS"
                      ? "border-red-500"
                      : "border-yellow-500",
                    !isExpanded && expandedTeam && "opacity-50"
                  )}
                  onClick={() => setExpandedTeam(isExpanded ? null : teamId)}
                >
                  <CardHeader
                    className={cn(
                      "bg-muted transition-colors duration-300",
                      isExpanded && "bg-primary/10"
                    )}
                  >
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>Команда {teamId}</span>
                        <Badge
                          className={cn(
                            "dark:text-gray-50 transition-colors",
                            teamResult === "WIN"
                              ? "bg-green-500 hover:bg-green-500"
                              : teamResult === "LOSS"
                              ? "bg-red-500 hover:bg-red-500"
                              : "bg-yellow-500 hover:bg-yellow-500"
                          )}
                        >
                          {resultNames[teamResult]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{scores[parseInt(teamId) - 1]}</span>
                        <motion.div
                          initial={false}
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 pb-4">
                    <div className="space-y-4">
                      {players.map((player) => (
                        <div key={player.id}>
                          <div className="flex items-center gap-4">
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
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {player.userId.startsWith("bot_") ? (
                                    player.userId.replace("bot_", "")
                                  ) : (
                                    <Link
                                      href={`/users/${player.userId}`}
                                      className="hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {player.user.name}
                                    </Link>
                                  )}
                                  {player.userId === session?.user.id && (
                                    <Badge variant="secondary" className="ml-2">
                                      Вы
                                    </Badge>
                                  )}
                                </span>
                                {match.isRated &&
                                  !player.userId.startsWith("bot_") && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        player.ratingChange > 0
                                          ? "text-green-500 border-green-500"
                                          : player.ratingChange < 0
                                          ? "text-red-500 border-red-500"
                                          : "text-yellow-500 border-yellow-500"
                                      )}
                                    >
                                      {player.ratingChange > 0 ? "+" : ""}
                                      {player.ratingChange} ELO
                                    </Badge>
                                  )}
                                {player.hasLeft && (
                                  <Badge variant="destructive">
                                    Покинул игру
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <AnimatePresence>
                  {isExpanded && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                        onClick={() => setExpandedTeam(null)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{
                          type: "spring",
                          damping: 20,
                          stiffness: 300,
                        }}
                        className="fixed inset-x-0 top-4 bottom-4 container mx-auto z-50 bg-background shadow-2xl border rounded-lg overflow-hidden"
                      >
                        <Card className="h-full border-none shadow-none rounded-none flex flex-col">
                          <CardHeader className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm pb-4 border-b flex-none">
                            <div className="flex items-center justify-between">
                              <CardTitle className="flex items-center gap-2">
                                <span>Команда {teamId}</span>
                                <Badge
                                  className={cn(
                                    "dark:text-gray-50",
                                    teamResult === "WIN"
                                      ? "bg-green-500"
                                      : teamResult === "LOSS"
                                      ? "bg-red-500"
                                      : "bg-yellow-500"
                                  )}
                                >
                                  {resultNames[teamResult]}
                                </Badge>
                              </CardTitle>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setExpandedTeam(null)}
                              >
                                <ChevronDown className="w-6 h-6 rotate-180" />
                              </Button>
                            </div>
                          </CardHeader>
                          <div className="flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                              <CardContent className="pt-6">
                                <div className="space-y-8">
                                  {players.map((player) => (
                                    <div key={player.id}>
                                      <div className="flex items-center gap-4">
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
                                              <AvatarImage
                                                src={player.user.image || ""}
                                              />
                                              <AvatarFallback>
                                                <User className="h-4 w-4" />
                                              </AvatarFallback>
                                            </Avatar>
                                          </div>
                                        )}
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                              {player.userId.startsWith(
                                                "bot_"
                                              ) ? (
                                                player.userId.replace(
                                                  "bot_",
                                                  ""
                                                )
                                              ) : (
                                                <Link
                                                  href={`/users/${player.userId}`}
                                                  className="hover:underline"
                                                >
                                                  {player.user.name}
                                                </Link>
                                              )}
                                              {player.userId ===
                                                session?.user.id && (
                                                <Badge
                                                  variant="secondary"
                                                  className="ml-2"
                                                >
                                                  Вы
                                                </Badge>
                                              )}
                                            </span>
                                            {match.isRated &&
                                              !player.userId.startsWith(
                                                "bot_"
                                              ) && (
                                                <Badge
                                                  variant="outline"
                                                  className={cn(
                                                    player.ratingChange > 0
                                                      ? "text-green-500 border-green-500"
                                                      : player.ratingChange < 0
                                                      ? "text-red-500 border-red-500"
                                                      : "text-yellow-500 border-yellow-500"
                                                  )}
                                                >
                                                  {player.ratingChange > 0
                                                    ? "+"
                                                    : ""}
                                                  {player.ratingChange} очков
                                                </Badge>
                                              )}
                                            {player.hasLeft && (
                                              <Badge variant="destructive">
                                                Покинул игру
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <Separator className="my-4" />

                                      <Tabs
                                        defaultValue="damage"
                                        className="w-full"
                                      >
                                        <TabsList className="w-full grid grid-cols-3">
                                          <TabsTrigger value="damage">
                                            Урон
                                          </TabsTrigger>
                                          <TabsTrigger value="divisions">
                                            Дивизионы
                                          </TabsTrigger>
                                          <TabsTrigger value="resources">
                                            Ресурсы
                                          </TabsTrigger>
                                        </TabsList>
                                        <TabsContent
                                          value="damage"
                                          className="mt-4"
                                        >
                                          <div className="grid grid-cols-2 gap-4">
                                            {/* Нанесенный урон */}
                                            <div className="space-y-4">
                                              <div className="p-3 rounded-lg bg-muted">
                                                <div className="text-sm font-medium">
                                                  Нанесенный урон
                                                </div>
                                                <div className="flex items-center gap-2 text-2xl font-bold mt-1">
                                                  <Target className="h-5 w-5 text-red-500" />
                                                  {player.totalDamageDealt}
                                                </div>
                                              </div>
                                              <div>
                                                <div className="text-sm font-medium mb-2">
                                                  Урон по игрокам:
                                                </div>
                                                <div className="space-y-2">
                                                  {Object.entries(
                                                    player.damageDealt as DamageDealt
                                                  ).map(
                                                    ([targetId, damageInfo]) => {
                                                      const target =
                                                        match.players.find(
                                                          (p) =>
                                                            p.userId === targetId
                                                        );
                                                      if (!target) return null;
                                                      return (
                                                        <div
                                                          key={targetId}
                                                          className={cn(
                                                            "flex items-center gap-2 p-3 rounded-lg",
                                                            damageInfo.isAlly
                                                              ? "bg-destructive/20 border-2 border-destructive"
                                                              : "bg-muted"
                                                          )}
                                                        >
                                                          <Avatar className="h-8 w-8">
                                                            <AvatarImage
                                                              src={
                                                                target.userId.startsWith(
                                                                  "bot_"
                                                                )
                                                                  ? ""
                                                                  : target.user
                                                                      .image ||
                                                                    ""
                                                              }
                                                            />
                                                            <AvatarFallback>
                                                              {target.userId.startsWith(
                                                                "bot_"
                                                              ) ? (
                                                                <Bot className="h-4 w-4" />
                                                              ) : (
                                                                <User className="h-4 w-4" />
                                                              )}
                                                            </AvatarFallback>
                                                          </Avatar>
                                                          <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                              <div className="text-sm font-medium">
                                                                {target.userId.startsWith(
                                                                  "bot_"
                                                                )
                                                                  ? target.userId.replace(
                                                                      "bot_",
                                                                      ""
                                                                    )
                                                                  : target.user
                                                                      .name}
                                                              </div>
                                                              {damageInfo.isAlly && (
                                                                <Badge
                                                                  variant="destructive"
                                                                  className="text-xs"
                                                                >
                                                                  Урон по
                                                                  союзнику!
                                                                </Badge>
                                                              )}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground mt-1">
                                                              Нанесено {damageInfo.damage}{" "}
                                                              урона
                                                            </div>
                                                          </div>
                                                        </div>
                                                      );
                                                    }
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            {/* Полученный урон */}
                                            <div className="space-y-4">
                                              <div className="p-3 rounded-lg bg-muted">
                                                <div className="text-sm font-medium">
                                                  Полученный урон
                                                </div>
                                                <div className="flex items-center gap-2 text-2xl font-bold mt-1">
                                                  <Target className="h-5 w-5 text-orange-500" />
                                                  {player.totalDamageReceived}
                                                </div>
                                              </div>
                                              <div>
                                                <div className="text-sm font-medium mb-2">
                                                  Урон от игроков:
                                                </div>
                                                <div className="space-y-2">
                                                  {Object.entries(
                                                    player.damageReceived as DamageReceived
                                                  ).map(
                                                    ([attackerId, damageInfo]) => {
                                                      const attacker =
                                                        match.players.find(
                                                          (p) =>
                                                            p.userId === attackerId
                                                        );
                                                      if (!attacker) return null;
                                                      return (
                                                        <div
                                                          key={attackerId}
                                                          className={cn(
                                                            "flex items-center gap-2 p-3 rounded-lg",
                                                            damageInfo.isAlly
                                                              ? "bg-destructive/20 border-2 border-destructive"
                                                              : "bg-muted"
                                                          )}
                                                        >
                                                          <Avatar className="h-8 w-8">
                                                            <AvatarImage
                                                              src={
                                                                attacker.userId.startsWith(
                                                                  "bot_"
                                                                )
                                                                  ? ""
                                                                  : attacker
                                                                      .user
                                                                      .image ||
                                                                    ""
                                                              }
                                                            />
                                                            <AvatarFallback>
                                                              {attacker.userId.startsWith(
                                                                "bot_"
                                                              ) ? (
                                                                <Bot className="h-4 w-4" />
                                                              ) : (
                                                                <User className="h-4 w-4" />
                                                              )}
                                                            </AvatarFallback>
                                                          </Avatar>
                                                          <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                              <div className="text-sm font-medium">
                                                                {attacker.userId.startsWith(
                                                                  "bot_"
                                                                )
                                                                  ? attacker.userId.replace(
                                                                      "bot_",
                                                                      ""
                                                                    )
                                                                  : attacker
                                                                      .user
                                                                      .name}
                                                              </div>
                                                              {damageInfo.isAlly && (
                                                                <Badge
                                                                  variant="destructive"
                                                                  className="text-xs"
                                                                >
                                                                  Урон от
                                                                  союзника!
                                                                </Badge>
                                                              )}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground mt-1">
                                                              Получено {damageInfo.damage}{" "}
                                                              урона
                                                            </div>
                                                          </div>
                                                        </div>
                                                      );
                                                    }
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </TabsContent>
                                        <TabsContent
                                          value="divisions"
                                          className="mt-4"
                                        >
                                          <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(
                                              player.divisions as Divisions
                                            ).map(([division, divisionInfo]) => (
                                              <div
                                                key={division}
                                                className={cn(
                                                  "p-3 rounded-lg",
                                                  divisionInfo.result === "WIN"
                                                    ? "bg-green-500/20 border-2 border-green-500"
                                                    : divisionInfo.result === "LOSS"
                                                      ? "bg-red-500/20 border-2 border-red-500"
                                                      : "bg-yellow-500/20 border-2 border-yellow-500"
                                                )}
                                              >
                                                <div className="text-sm font-medium">
                                                  {division}
                                                </div>
                                                <div className="flex items-center justify-between mt-1">
                                                  <div className="text-sm text-muted-foreground">
                                                    {divisionInfo.scores} очков
                                                  </div>
                                                  <Badge
                                                    className={cn(
                                                      "text-xs",
                                                      divisionInfo.result === "WIN"
                                                        ? "bg-green-500"
                                                        : divisionInfo.result === "LOSS"
                                                          ? "bg-red-500"
                                                          : "bg-yellow-500"
                                                    )}
                                                  >
                                                    {resultNames[divisionInfo.result]}
                                                  </Badge>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </TabsContent>
                                        <TabsContent
                                          value="resources"
                                          className="mt-4"
                                        >
                                          <div className="grid grid-cols-2 gap-2">
                                            <div className="p-3 rounded-lg bg-muted">
                                              <div className="flex items-center gap-2 text-sm font-medium">
                                                <Coins className="h-4 w-4 text-yellow-500" />
                                                <span>Собрано денег</span>
                                              </div>
                                              <div className="text-sm text-muted-foreground mt-1">
                                                {player.moneyTaken}
                                              </div>
                                            </div>
                                            <div className="p-3 rounded-lg bg-muted">
                                              <div className="flex items-center gap-2 text-sm font-medium">
                                                <ShieldHalf className="h-4 w-4 text-blue-500" />
                                                <span>Собрано брони</span>
                                              </div>
                                              <div className="text-sm text-muted-foreground mt-1">
                                                {player.armorTaken}
                                              </div>
                                            </div>
                                            <div className="p-3 rounded-lg bg-muted">
                                              <div className="flex items-center gap-2 text-sm font-medium">
                                                <Bomb className="h-4 w-4 text-red-500" />
                                                <span>Урон от мин</span>
                                              </div>
                                              <div className="text-sm text-muted-foreground mt-1">
                                                {player.minesDamage}
                                              </div>
                                            </div>
                                            <div className="p-3 rounded-lg bg-muted">
                                              <div className="flex items-center gap-2 text-sm font-medium">
                                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                                <span>Вылетов за трассу</span>
                                              </div>
                                              <div className="text-sm text-muted-foreground mt-1">
                                                {player.wipeouts}
                                              </div>
                                            </div>
                                          </div>
                                        </TabsContent>
                                      </Tabs>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </ScrollArea>
                          </div>
                        </Card>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Детали матча */}
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
    </div>
  );
}
