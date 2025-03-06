'use client';

import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { Role } from '@prisma/client';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function EditBotPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: bot, isLoading } = trpc.users.byId.useQuery(params.id as string);
  const updateBot = trpc.users.update.useMutation({
    onSuccess: () => {
      router.back();
    },
  });

  const [rating, setRating] = useState<string>('');

  const canManageBots = session?.user.role === Role.ADMIN || session?.user.role === Role.MODERATOR;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-muted-foreground">Загрузка данных бота...</div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-destructive">Бот не найден</div>
      </div>
    );
  }

  if (!canManageBots) {
    router.back();
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRating = parseInt(rating);
    if (isNaN(newRating)) return;

    updateBot.mutate({
      id: bot.id,
      stats: {
        rating: newRating,
        wins: bot.stats?.wins ?? 0,
        losses: bot.stats?.losses ?? 0,
        draws: bot.stats?.draws ?? 0,
      },
    });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between border-b pb-4 pt-6">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-3xl font-bold tracking-tight">Редактирование бота</h1>
          </div>
          <p className="text-muted-foreground">Изменение рейтинга бота {bot.name}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 py-6">
        <Card className="border-border/40 shadow-sm max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Изменить рейтинг</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Текущий рейтинг: {bot.stats?.rating}</Label>
                <Input
                  id="rating"
                  type="number"
                  placeholder="Введите новый рейтинг"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={!rating || updateBot.isLoading} className="w-full">
                {updateBot.isLoading ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
