import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Match, User } from "@prisma/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import Image from "next/image";

type MatchWithPlayers = Match & {
  team1Players: User[];
  team2Players: User[];
  team1Score: number;
  team2Score: number;
};

interface MatchesTableProps {
  matches: MatchWithPlayers[];
  currentUserId?: string;
}

export function MatchesTable({ matches, currentUserId }: MatchesTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Команда 1</TableHead>
            <TableHead className="text-center">Счёт</TableHead>
            <TableHead>Команда 2</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match) => (
            <TableRow key={match.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(match.createdAt), "d MMMM yyyy, HH:mm", {
                  locale: ru,
                })}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-2">
                  {match.team1Players.map((player) => (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center gap-2",
                        currentUserId === player.id &&
                          "rounded bg-primary/10 p-1"
                      )}
                    >
                      <div className="h-6 w-6 relative">
                        {player.image ? (
                          <Image
                            src={player.image}
                            alt={player.name || ""}
                            className="rounded-full"
                            fill
                            sizes="24px"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-muted" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-sm",
                          currentUserId === player.id &&
                            "text-primary font-medium"
                        )}
                      >
                        {player.name}
                      </span>
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-center whitespace-nowrap font-medium">
                {match.team1Score} : {match.team2Score}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-2">
                  {match.team2Players.map((player) => (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center gap-2",
                        currentUserId === player.id &&
                          "rounded bg-primary/10 p-1"
                      )}
                    >
                      <div className="h-6 w-6 relative">
                        {player.image ? (
                          <Image
                            src={player.image}
                            alt={player.name || ""}
                            className="rounded-full"
                            fill
                            sizes="24px"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-muted" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-sm",
                          currentUserId === player.id &&
                            "text-primary font-medium"
                        )}
                      >
                        {player.name}
                      </span>
                    </div>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
