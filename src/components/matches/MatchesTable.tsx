import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/utils/trpc";
import { GameMode, Match, MatchPlayer, User } from "@prisma/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Shield, ShieldOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

interface MatchesTableProps {
  userId?: string;
  onlyRated?: boolean;
  gameMode?: GameMode;
}

type MatchWithRelations = Match & {
  players: (MatchPlayer & {
    user: User;
  })[];
  creator: User;
};

const ITEMS_PER_PAGE = 10;

export function MatchesTable({
  userId,
  onlyRated,
  gameMode,
}: MatchesTableProps) {
  const router = useRouter();
  const [page, setPage] = React.useState(1);

  const { data: matchesData, isLoading } = trpc.matches.list.useQuery(
    {
      limit: ITEMS_PER_PAGE,
      offset: (page - 1) * ITEMS_PER_PAGE,
      filters: {
        userId,
        onlyRated,
        gameMode,
      },
    },
    {
      staleTime: 1 * 60 * 1000, // 1 минута - список матчей может обновляться чаще
      refetchOnWindowFocus: false,
    }
  );

  const getTeams = React.useCallback((match: MatchWithRelations) => {
    return match.players.reduce((acc: (MatchPlayer & { user: User })[][], player) => {
      if (!acc[player.team - 1]) {
        acc[player.team - 1] = [];
      }
      acc[player.team - 1].push(player);
      return acc;
    }, []);
  }, []);

  const getGameModeText = React.useCallback((mode: GameMode): string => {
    switch (mode) {
      case 'TWO_VS_TWO':
      case 'TWO_VS_TWO_HIGH_MMR':
        return mode === 'TWO_VS_TWO_HIGH_MMR' ? '2 vs 2 (High MMR)' : '2 vs 2';
      case 'THREE_VS_THREE':
      case 'THREE_VS_THREE_HIGH_MMR':
        return mode === 'THREE_VS_THREE_HIGH_MMR' ? '3 vs 3 (High MMR)' : '3 vs 3';
      case 'TWO_VS_TWO_VS_TWO':
        return '2 vs 2 vs 2';
      default:
        return mode;
    }
  }, []);

  const renderTeam = React.useCallback((players: (MatchPlayer & { user: User })[], isRated: boolean) => {
    return (
      <div className="flex flex-col gap-1">
        {players.map((player) => {
          const isBot = player.userId.startsWith('bot_');
          return (
            <div key={player.id} className="flex items-center gap-1 text-xs">
              {isRated && !isBot && (
                <span
                  className={
                    player.result === 'WIN'
                      ? 'text-green-500'
                      : player.result === 'LOSS'
                        ? 'text-red-500'
                        : 'text-yellow-500'
                  }
                >
                  {player.result === 'WIN' ? '+' : player.result === 'LOSS' ? '' : ''}
                  {player.ratingChange}
                </span>
              )}
              <span className={isBot ? 'text-muted-foreground' : 'hover:underline cursor-pointer'}>
                {isBot && player.user.name}
                {!isBot && (
                  <Link
                    href={`/users/${player.userId}`}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {player.user.name}
                  </Link>
                )}
              </span>
            </div>
          );
        })}
      </div>
    );
  }, []);

  const totalPages = React.useMemo(
    () => (matchesData ? Math.ceil(matchesData.total / ITEMS_PER_PAGE) : 1),
    [matchesData]
  );

  const renderPaginationItems = React.useCallback(() => {
    const items = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, page - halfVisible);
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Всегда показываем первую страницу
    items.push(
      <PaginationItem key="1">
        <PaginationLink
          onClick={() => setPage(1)}
          isActive={page === 1}
          className={page === 1 ? "" : "hover:bg-muted"}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    // Показываем многоточие после первой страницы, если нужно
    if (startPage > 2) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Показываем страницы между первой и последней
    for (
      let i = Math.max(2, startPage);
      i <= Math.min(endPage, totalPages - 1);
      i++
    ) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => setPage(i)}
            isActive={page === i}
            className={page === i ? "" : "hover:bg-muted"}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Показываем многоточие перед последней страницей, если нужно
    if (endPage < totalPages - 1) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Всегда показываем последнюю страницу, если она не равна первой
    if (totalPages > 1) {
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => setPage(totalPages)}
            isActive={page === totalPages}
            className={page === totalPages ? "" : "hover:bg-muted"}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  }, [page, totalPages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!matchesData?.matches || matchesData.matches.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">История матчей пуста</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <ScrollArea className="flex-1 rounded-md border">
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Дата</TableHead>
                <TableHead className="w-24">Режим</TableHead>
                <TableHead className="w-24">Счет</TableHead>
                <TableHead className="w-[200px]">Команда 1</TableHead>
                <TableHead className="w-[200px]">Команда 2</TableHead>
                <TableHead className="w-[200px]">Команда 3</TableHead>
                <TableHead className="w-24 text-center">Рейтинг</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matchesData.matches.map((match) => {
                const teams = getTeams(match);
                return (
                  <TableRow
                    key={match.id}
                    className="cursor-pointer hover:bg-muted/50"
                    role="button"
                    tabIndex={0}
                    aria-label={`Открыть матч от ${format(new Date(match.createdAt), "dd.MM.yyyy HH:mm", { locale: ru })}`}
                    onClick={() => router.push(`/matches/${match.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/matches/${match.id}`);
                      }
                    }}
                  >
                    <TableCell className="py-2">
                      {format(new Date(match.createdAt), "dd.MM.yyyy HH:mm", {
                        locale: ru,
                      })}
                    </TableCell>
                    <TableCell className="py-2">
                      {getGameModeText(match.mode)}
                    </TableCell>
                    <TableCell className="py-2">{match.totalScore}</TableCell>
                    {teams.map((team, index) => (
                      <TableCell key={index} className="py-2">
                        {renderTeam(team, match.isRated)}
                      </TableCell>
                    ))}
                    {match.mode !== "TWO_VS_TWO_VS_TWO" && (
                      <TableCell className="py-2" />
                    )}
                    <TableCell className="py-2 text-center">
                      {match.isRated ? (
                        <Shield className="h-4 w-4 inline-block text-primary" />
                      ) : (
                        <ShieldOff className="h-4 w-4 inline-block text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Всего {matchesData.total} матчей
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage(page - 1);
                }}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
                aria-disabled={page === 1}
              />
            </PaginationItem>
            {renderPaginationItems()}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage(page + 1);
                }}
                className={
                  page === totalPages ? "pointer-events-none opacity-50" : ""
                }
                aria-disabled={page === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <div className="w-[100px]" />
      </div>
    </div>
  );
}
