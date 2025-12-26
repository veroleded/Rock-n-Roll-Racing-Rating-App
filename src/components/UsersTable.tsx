import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Role, User } from "@prisma/client";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  GiLaurelCrown,
  GiMedal,
  GiRibbonMedal,
  GiTrophyCup,
} from "react-icons/gi";

type UserWithStats = User & {
  stats: {
    rating: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
  } | null;
};

type Column = {
  key:
    | keyof UserWithStats
    | "winRate"
    | "stats.rating"
    | "stats.gamesPlayed"
    | "stats.wins"
    | "stats.losses"
    | "stats.draws"
    | "position";
  label: string;
  sortable?: boolean;
};

interface UsersTableProps {
  users: UserWithStats[];
  isAdminView?: boolean;
  currentUserRole?: Role;
  currentUserId?: string;
}

const MedalIcon = ({ position }: { position: number }) => {
  const medalStyles = {
    1: {
      icon: GiLaurelCrown,
      className: "text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]",
      size: "h-9 w-9",
    },
    2: {
      icon: GiTrophyCup,
      className: "text-gray-300 drop-shadow-[0_0_8px_rgba(156,163,175,0.6)]",
      size: "h-8 w-8",
    },
    3: {
      icon: GiMedal,
      className: "text-amber-700 drop-shadow-[0_0_8px_rgba(180,83,9,0.6)]",
      size: "h-8 w-8",
    },
  };

  const Icon =
    position <= 3
      ? medalStyles[position as keyof typeof medalStyles].icon
      : GiRibbonMedal;
  const baseStyle =
    position <= 3
      ? medalStyles[position as keyof typeof medalStyles]
      : {
          className:
            position <= 10
              ? "text-blue-400 drop-shadow-[0_0_4px_rgba(96,165,250,0.6)]"
              : "text-gray-300",
          size: "h-8 w-8",
        };

  return (
    <div className="relative flex items-center justify-center group">
      <Icon
        className={cn(
          baseStyle.size,
          baseStyle.className,
          "transition-all group-hover:scale-110"
        )}
      />
      {position > 3 && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "rounded-full -m-1"
          )}
        >
          <span
            className={cn(
              "text-base font-black",
              "text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]"
            )}
          >
            {position}
          </span>
        </div>
      )}
    </div>
  );
};

export function UsersTable({
  users,
  currentUserRole,
  currentUserId,
}: UsersTableProps) {
  const router = useRouter();
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({
    key: "stats.rating",
    direction: "desc",
  });

  const columns: Column[] = [
    { key: "position", label: "Место", sortable: false },
    { key: "name", label: "Имя", sortable: true },
    { key: "stats.rating", label: "Рейтинг", sortable: true },
    { key: "stats.gamesPlayed", label: "Игр", sortable: true },
    { key: "stats.wins", label: "Победы", sortable: true },
    { key: "stats.losses", label: "Поражения", sortable: true },
    { key: "stats.draws", label: "Ничьи", sortable: true },
    { key: "winRate", label: "Винрейт", sortable: true },
  ];

  const handleSort = (key: string) => {
    setSortConfig((currentSort) => {
      if (currentSort?.key === key) {
        return {
          key,
          direction: currentSort.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const getValue = (user: UserWithStats, key: string) => {
    if (key === "winRate") {
      const wins = user.stats?.wins || 0;
      const total = user.stats?.gamesPlayed || 0;
      return total > 0 ? (wins / total) * 100 : 0;
    }
    if (key.includes(".")) {
      const [parent, child] = key.split(".");
      return (
        user[parent as keyof UserWithStats]?.[
          child as keyof UserWithStats["stats"]
        ] || 0
      );
    }
    return user[key as keyof UserWithStats];
  };

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
    const aValue = getValue(a, sortConfig.key) ?? 0;
    const bValue = getValue(b, sortConfig.key) ?? 0;

    if (aValue === bValue) return 0;
    if (sortConfig.direction === "asc") {
      return aValue < bValue ? -1 : 1;
    } else {
      return aValue > bValue ? -1 : 1;
    }
      }),
    [users, sortConfig]
  );

  // Получаем отсортированных по рейтингу пользователей для определения позиций
  const userPositions = useMemo(
    () => {
  const usersByRating = [...users].sort((a, b) => {
    const ratingA = a.stats?.rating || 0;
    const ratingB = b.stats?.rating || 0;
    return ratingB - ratingA;
  });
      return new Map(usersByRating.map((user, index) => [user.id, index + 1]));
    },
    [users]
  );

  const canEditUser = currentUserRole === "ADMIN";

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table className="min-w-[600px]">
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  column.sortable && 'cursor-pointer select-none hover:bg-muted/50',
                  column.key === 'name' && 'w-[200px]',
                  column.key === 'position' && 'w-[80px]',
                  sortConfig.key === column.key && 'bg-muted'
                )}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center justify-between space-x-2">
                  <span>{column.label}</span>
                  {column.sortable && (
                    <div className="flex items-center">
                      {sortConfig.key === column.key ? (
                        sortConfig.direction === 'desc' ? (
                          <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUp className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>
                  )}
                </div>
              </TableHead>
            ))}
            {canEditUser && <TableHead>Действия</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedUsers.map((user) => (
            <TableRow
              key={user.id}
              className="group cursor-pointer hover:bg-muted/50"
              role="button"
              tabIndex={0}
              aria-label={`Перейти к профилю ${user.name}`}
              onClick={(e) => {
                // Предотвращаем переход если клик был по кнопке редактирования
                if ((e.target as HTMLElement).closest('a[href*="/edit"]')) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                router.push(`/users/${user.id}`);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!(e.target as HTMLElement).closest('a[href*="/edit"]')) {
                    router.push(`/users/${user.id}`);
                  }
                }
              }}
            >
              <TableCell className="text-center">
                <MedalIcon position={userPositions.get(user.id)!} />
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 relative">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name || ''}
                        className="rounded-full"
                        fill
                        sizes="40px"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="font-medium group-hover:text-primary transition-colors">
                        {user.name}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.role.toLowerCase()}</div>
                    </div>
                    {currentUserId === user.id && (
                      <div className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Вы
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{user.stats?.rating}</TableCell>
              <TableCell>{user.stats?.gamesPlayed}</TableCell>
              <TableCell>{user.stats?.wins}</TableCell>
              <TableCell>{user.stats?.losses}</TableCell>
              <TableCell>{user.stats?.draws}</TableCell>
              <TableCell>
                {user.stats?.gamesPlayed
                  ? `${((user.stats?.wins / user.stats.gamesPlayed) * 100).toFixed(1)}%`
                  : '0%'}
              </TableCell>
              {canEditUser && (
                <TableCell>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/users/${user.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Редактировать</span>
                    </Link>
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
