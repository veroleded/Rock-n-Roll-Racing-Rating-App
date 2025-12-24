"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { Role } from "@prisma/client";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, use, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const formSchema = z.object({
  id: z.string(),
  role: z.enum(['ADMIN', 'MODERATOR', 'PLAYER']),
  stats: z
    .object({
      rating: z.number(),
      maxRating: z.number(),
      minRating: z.number(),
      totalScore: z.number().min(0),
      gamesPlayed: z.number().min(0),
      wins: z.number().min(0),
      losses: z.number().min(0),
      draws: z.number().min(0),
      totalDivisions: z.number().min(0),
      winsDivisions: z.number().min(0),
      lossesDivisions: z.number().min(0),
      drawsDivisions: z.number().min(0),
    })
    .nullable(),
});

type FormValues = z.infer<typeof formSchema>;

function EditUserContent({ userId }: { userId: string }) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<Role | undefined>(undefined);

  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: userData, isLoading } = trpc.users.byId.useQuery(userId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: userId,
      role: undefined as unknown as Role,
      stats: null,
    },
  });

  const { mutate: updateUser, isLoading: isUpdating } = trpc.users.update.useMutation({
    onSuccess: (user) => {
      router.push(`/users/${user.id}`);
    },
    onError: (error) => {
      form.setError('root', {
        type: 'manual',
        message: error.message,
      });
    },
  });

  const { mutate: deleteUser, isLoading: isDeleting } = trpc.users.delete.useMutation({
    onSuccess: () => {
      router.push('/users');
    },
    onError: (error) => {
      form.setError('root', {
        type: 'manual',
        message: error.message,
      });
    },
  });

  useEffect(() => {
    if (userData) {
      setUserRole(userData.role);
      form.reset({
        id: userData.id,
        role: userData.role,
        stats: userData.stats || null,
      });
    }
  }, [userData, form]);

  if (!session?.user || session.user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-destructive">У вас нет прав для редактирования пользователей</div>
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
    if (userData.role === 'ADMIN' && data.role !== 'ADMIN') {
      form.setError('role', {
        type: 'manual',
        message: 'Нельзя изменить роль администратора',
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
    if (userData.role === 'ADMIN' && userData.id !== session?.user.id) {
      form.setError('root', {
        type: 'manual',
        message: 'Нельзя удалить другого администратора',
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
              <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
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
          <h2 className="text-2xl font-bold tracking-tight">Редактирование пользователя</h2>
          <p className="text-muted-foreground">
            {userData.name} ({userData.role.toLowerCase()})
          </p>
        </div>
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={userData.role === 'ADMIN' && userData.id !== session?.user.id}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Удалить пользователя?</DialogTitle>
              <DialogDescription>
                Это действие нельзя отменить. Пользователь будет удален из системы вместе со всей
                статистикой.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>
                Отмена
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Удаление...
                  </>
                ) : (
                  'Удалить'
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
            <CardDescription>Управление основными данными пользователя</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="name">
                  Имя
                </label>
                <Input id="name" value={userData.name || ''} disabled className="w-full bg-muted" />
                <p className="text-sm text-muted-foreground">Имя пользователя нельзя изменить</p>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Роль</label>
                {userData && userRole && (
                  <Select
                    value={userRole}
                    onValueChange={(value: Role) => {
                      setUserRole(value);
                      form.setValue('role', value);
                    }}
                    disabled={userData.role === 'ADMIN'}
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
                )}
                {form.formState.errors.role && (
                  <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {userData.stats && (
          <Card>
            <CardHeader>
              <CardTitle>Статистика</CardTitle>
              <CardDescription>Управление игровой статистикой пользователя</CardDescription>
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
                    step="0.01"
                    {...form.register('stats.rating', { setValueAs: (value) => Number(value) })}
                  />
                  {form.formState.errors.stats?.rating && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.stats.rating.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="maxRating">
                    Максимальный рейтинг
                  </label>
                  <Input
                    id="maxRating"
                    type="number"
                    step="0.01"
                    {...form.register('stats.maxRating', { setValueAs: (value) => Number(value) })}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="minRating">
                    Минимальный рейтинг
                  </label>
                  <Input
                    id="minRating"
                    type="number"
                    step="0.01"
                    {...form.register('stats.minRating', { setValueAs: (value) => Number(value) })}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="totalScore">
                    Общий счет
                  </label>
                  <Input
                    id="totalScore"
                    type="number"
                    {...form.register('stats.totalScore', { setValueAs: (value) => Number(value) })}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="gamesPlayed">
                    Сыграно игр
                  </label>
                  <Input
                    id="gamesPlayed"
                    type="number"
                    {...form.register('stats.gamesPlayed', {
                      setValueAs: (value) => Number(value),
                    })}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="wins">
                    Победы
                  </label>
                  <Input
                    id="wins"
                    type="number"
                    {...form.register('stats.wins', { setValueAs: (value) => Number(value) })}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="losses">
                    Поражения
                  </label>
                  <Input
                    id="losses"
                    type="number"
                    {...form.register('stats.losses', { setValueAs: (value) => Number(value) })}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="draws">
                    Ничьи
                  </label>
                  <Input
                    id="draws"
                    type="number"
                    {...form.register('stats.draws', { setValueAs: (value) => Number(value) })}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="totalDivisions">
                    Всего дивизионов
                  </label>
                  <Input
                    id="totalDivisions"
                    type="number"
                    {...form.register('stats.totalDivisions', {
                      setValueAs: (value) => Number(value),
                    })}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="winsDivisions">
                    Победы в дивизионах
                  </label>
                  <Input
                    id="winsDivisions"
                    type="number"
                    {...form.register('stats.winsDivisions', {
                      setValueAs: (value) => Number(value),
                    })}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="lossesDivisions">
                    Поражения в дивизионах
                  </label>
                  <Input
                    id="lossesDivisions"
                    type="number"
                    {...form.register('stats.lossesDivisions', {
                      setValueAs: (value) => Number(value),
                    })}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="drawsDivisions">
                    Ничьи в дивизионах
                  </label>
                  <Input
                    id="drawsDivisions"
                    type="number"
                    {...form.register('stats.drawsDivisions', {
                      setValueAs: (value) => Number(value),
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.push('/users')}>
            Отмена
          </Button>
          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
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
