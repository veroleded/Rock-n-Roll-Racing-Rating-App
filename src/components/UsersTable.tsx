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
import { ArrowUpDown, Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

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
    | "stats.draws";
  label: string;
  sortable?: boolean;
};

interface UsersTableProps {
  users: UserWithStats[];
  isAdminView?: boolean;
  currentUserRole?: Role;
}

export function UsersTable({
  users,
  isAdminView = false,
  currentUserRole,
}: UsersTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({
    key: "stats.rating",
    direction: "desc",
  });

  const columns: Column[] = [
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

  const sortedUsers = [...users].sort((a, b) => {
    const aValue = getValue(a, sortConfig.key) ?? 0;
    const bValue = getValue(b, sortConfig.key) ?? 0;

    if (aValue === bValue) return 0;
    if (sortConfig.direction === "asc") {
      return aValue < bValue ? -1 : 1;
    } else {
      return aValue > bValue ? -1 : 1;
    }
  });

  const canEditUser =
    isAdminView &&
    (currentUserRole === "ADMIN" || currentUserRole === "MODERATOR");

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  column.sortable && "cursor-pointer select-none",
                  column.key === "name" && "w-[200px]"
                )}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center space-x-2">
                  <span>{column.label}</span>
                  {column.sortable && (
                    <ArrowUpDown
                      className={cn(
                        "h-4 w-4",
                        sortConfig?.key === column.key &&
                          sortConfig.direction === "desc" &&
                          "transform rotate-180"
                      )}
                    />
                  )}
                </div>
              </TableHead>
            ))}
            {canEditUser && <TableHead>Действия</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 relative">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name || ""}
                        className="rounded-full"
                        fill
                        sizes="40px"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.role.toLowerCase()}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{user.stats?.rating || 1000}</TableCell>
              <TableCell>{user.stats?.gamesPlayed || 0}</TableCell>
              <TableCell>{user.stats?.wins || 0}</TableCell>
              <TableCell>{user.stats?.losses || 0}</TableCell>
              <TableCell>{user.stats?.draws || 0}</TableCell>
              <TableCell>
                {user.stats?.gamesPlayed
                  ? `${(
                      ((user.stats?.wins || 0) / user.stats.gamesPlayed) *
                      100
                    ).toFixed(1)}%`
                  : "0%"}
              </TableCell>
              {canEditUser && (
                <TableCell>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/admin/users/${user.id}`}>
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
