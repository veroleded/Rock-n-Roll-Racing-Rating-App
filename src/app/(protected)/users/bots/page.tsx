'use client';

import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { trpc } from '@/utils/trpc';
import { Role } from '@prisma/client';
import Link from 'next/link';

export default function BotsPage() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: bots, isLoading } = trpc.users.botListForEdit.useQuery();

  const canManageBots = session?.user.role === Role.ADMIN || session?.user.role === Role.MODERATOR;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-muted-foreground">Загрузка списка ботов...</div>
      </div>
    );
  }

  if (!bots) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-destructive">Ошибка загрузки ботов</div>
      </div>
    );
  }

  if (!canManageBots) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-destructive">У вас нет доступа к этой странице</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between border-b pb-4 pt-6">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-3xl font-bold tracking-tight">Боты</h1>
          </div>
          <p className="text-muted-foreground">Управление ботами и их рейтингом</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 py-6">
        <Card className="border-border/40 shadow-sm h-full flex flex-col">
          <CardHeader>
            <CardTitle>Список ботов</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <ScrollArea className="h-full rounded-md border">
              <div className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Рейтинг</TableHead>
                      <TableHead>Победы</TableHead>
                      <TableHead>Поражения</TableHead>
                      <TableHead>Ничьи</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bots.map((bot) => (
                      <TableRow key={bot.id}>
                        <TableCell>{bot.name}</TableCell>
                        <TableCell>{bot.stats?.rating ?? 0}</TableCell>
                        <TableCell>{bot.stats?.wins ?? 0}</TableCell>
                        <TableCell>{bot.stats?.losses ?? 0}</TableCell>
                        <TableCell>{bot.stats?.draws ?? 0}</TableCell>
                        <TableCell className="text-right">
                          {canManageBots && (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/users/bots/${bot.id}`}>Редактировать</Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
