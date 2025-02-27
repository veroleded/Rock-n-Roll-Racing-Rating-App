"use client";

import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UsersTable } from "@/components/UsersTable";
import { trpc } from "@/utils/trpc";
import { Role } from "@prisma/client";

export default function UsersPage() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: users, isLoading } = trpc.users.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-muted-foreground">
          Загрузка списка пользователей...
        </div>
      </div>
    );
  }

  if (!users) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-destructive">Ошибка загрузки пользователей</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between border-b pb-4 pt-6">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-3xl font-bold tracking-tight">Пользователи</h1>
          </div>
          <p className="text-muted-foreground">
            Управление пользователями и их статистикой
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 py-6">
        <Card className="border-border/40 shadow-sm h-full flex flex-col">
          <CardHeader>
            <CardTitle>Список пользователей</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <ScrollArea className="h-full rounded-md border">
              <div className="p-4">
                <UsersTable
                  users={users}
                  currentUserRole={session?.user.role as Role | undefined}
                />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
