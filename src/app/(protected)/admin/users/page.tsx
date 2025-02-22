"use client";

import { UsersTable } from "@/components/UsersTable";
import { trpc } from "@/utils/trpc";
import { Role } from "@prisma/client";

export default function UsersPage() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: users, isLoading } = trpc.users.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">
          Загрузка списка пользователей...
        </div>
      </div>
    );
  }

  if (!users) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-destructive">Ошибка загрузки пользователей</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Пользователи</h1>
          <p className="text-muted-foreground mt-2">
            Управление пользователями и их статистикой
          </p>
        </div>
      </div>

      <UsersTable
        users={users}
        isAdminView={true}
        currentUserRole={session?.user.role as Role | undefined}
      />
    </div>
  );
}
