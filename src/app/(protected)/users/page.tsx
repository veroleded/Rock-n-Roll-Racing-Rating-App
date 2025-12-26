"use client";

import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UsersTable } from '@/components/UsersTable';
import { trpc } from '@/utils/trpc';
import { Role } from '@prisma/client';
import Link from 'next/link';

export default function UsersPage() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: users, isLoading } = trpc.users.list.useQuery(undefined, {
    staleTime: 2 * 60 * 1000, // 2 минуты - список пользователей обновляется не часто
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-muted-foreground">Загрузка списка игроков...</div>
      </div>
    );
  }

  if (!users) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-destructive">Ошибка загрузки игроков</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 pt-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 sm:gap-4">
            <BackButton />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Таблица игроков</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">Просмотр игроков и их статистики</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/users/bots">Посмотреть ботов</Link>
        </Button>
      </div>

      <div className="flex-1 min-h-0 py-6">
        <Card className="border-border/40 shadow-sm h-full flex flex-col">
          <CardHeader>
            <CardTitle>Список игроков</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <ScrollArea className="h-full rounded-md border">
              <div className="p-2 sm:p-4 overflow-x-auto">
                <UsersTable
                  users={users}
                  currentUserRole={session?.user.role as Role | undefined}
                  currentUserId={session?.user.id}
                />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
