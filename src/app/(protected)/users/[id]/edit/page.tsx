"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { Role } from "@prisma/client";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Схема валидации формы
const formSchema = z.object({
  id: z.string(),
  role: z.enum(["ADMIN", "MODERATOR", "PLAYER"]),
  stats: z
    .object({
      rating: z.number().min(0).max(50000),
      gamesPlayed: z.number(),
      wins: z.number(),
      losses: z.number(),
      draws: z.number(),
    })
    .nullable(),
});

type FormValues = z.infer<typeof formSchema>;

function EditUserContent({ userId }: { userId: string }) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: userData, isLoading } = trpc.users.byId.useQuery(userId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: userId,
      role: userData?.role || "PLAYER",
      stats: userData?.stats || null,
    },
  });

  const { mutate: updateUser, isLoading: isUpdating } =
    trpc.users.update.useMutation({
      onSuccess: (user) => {
        router.push(`/users/${user.id}`);
      },
      onError: (error) => {
        form.setError("root", {
          type: "manual",
          message: error.message,
        });
      },
    });

  const { mutate: deleteUser, isLoading: isDeleting } =
    trpc.users.delete.useMutation({
      onSuccess: () => {
        router.push("/admin/users");
      },
      onError: (error) => {
        form.setError("root", {
          type: "manual",
          message: error.message,
        });
      },
    });

  useEffect(() => {
    if (userData) {
      form.reset({
        id: userData.id,
        role: userData.role,
        stats: userData.stats,
      });
    }
  }, [userData, form]);

  // Проверяем права доступа
  if (!session?.user || session.user.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-destructive">
          У вас нет прав для редактирования пользователей
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-destructive">Пользователь не найден</div>
      </div>
    );
  }

  const onSubmit = async (data: FormValues) => {
    // Проверяем, не пытаемся ли мы изменить роль администратора
    if (userData.role === "ADMIN" && data.role !== "ADMIN") {
      form.setError("role", {
        type: "manual",
        message: "Нельзя изменить роль администратора",
      });
      return;
    }

    updateUser({
      id: data.id,
      role: data.role,
      stats: data.stats || undefined,
    });
  };

  const handleDelete = () => {
    if (userData.role === "ADMIN") {
      form.setError("root", {
        type: "manual",
        message: "Нельзя удалить администратора",
      });
      return;
    }
    deleteUser(userData.id);
  };

  return (
    <div className="space-y-6">
      {form.formState.errors.root && (
        <div className="rounded-md bg-destructive/15 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-destructive"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-destructive">Ошибка</h3>
              <div className="mt-2 text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Редактирование пользователя
          </h2>
          <p className="text-muted-foreground">
            {userData.name} ({userData.role.toLowerCase()})
          </p>
        </div>
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" disabled={userData.role === "ADMIN"}>
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Удалить пользователя?</DialogTitle>
              <DialogDescription>
                Это действие нельзя отменить. Пользователь будет удален из
                системы вместе со всей статистикой.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Удаление...
                  </>
                ) : (
                  "Удалить"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
            <CardDescription>
              Управление основными данными пользователя
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="name">
                  Имя
                </label>
                <Input
                  id="name"
                  value={userData.name || ""}
                  disabled
                  className="w-full bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Имя пользователя нельзя изменить
                </p>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Роль</label>
                <Select
                  value={form.watch("role")}
                  onValueChange={(value: Role) => form.setValue("role", value)}
                  disabled={userData.role === "ADMIN"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLAYER">Игрок</SelectItem>
                    <SelectItem value="MODERATOR">Модератор</SelectItem>
                    <SelectItem value="ADMIN">Администратор</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.role && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.role.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {userData.stats && (
          <Card>
            <CardHeader>
              <CardTitle>Статистика</CardTitle>
              <CardDescription>
                Управление игровой статистикой пользователя
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="rating">
                    Рейтинг
                  </label>
                  <Input
                    id="rating"
                    type="number"
                    {...form.register("stats.rating", { valueAsNumber: true })}
                  />
                  {form.formState.errors.stats?.rating && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.stats.rating.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="gamesPlayed">
                    Сыграно игр
                  </label>
                  <Input
                    id="gamesPlayed"
                    type="number"
                    value={userData.stats.gamesPlayed}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="wins">
                    Победы
                  </label>
                  <Input
                    id="wins"
                    type="number"
                    value={userData.stats.wins}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="losses">
                    Поражения
                  </label>
                  <Input
                    id="losses"
                    type="number"
                    value={userData.stats.losses}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="draws">
                    Ничьи
                  </label>
                  <Input
                    id="draws"
                    type="number"
                    value={userData.stats.draws}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/users")}
          >
            Отмена
          </Button>
          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              "Сохранить"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EditUserContent userId={resolvedParams.id} />
    </Suspense>
  );
}
