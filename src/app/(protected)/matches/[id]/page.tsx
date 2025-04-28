'use client';

import { MatchActionButtons } from '@/components/matches/MatchActionButtons';
import { MatchDetails } from '@/components/matches/MatchDetails';
import { MatchHeader } from '@/components/matches/MatchHeader';
import { MatchLoading, MatchNotFound } from '@/components/matches/MatchLoading';
import { PlayerStatsDisplay } from '@/components/matches/PlayerStatsDisplay';
import { DamageDealt, DamageReceived, Divisions } from '@/components/matches/types';
import { useToast } from '@/components/ui/use-toast';
import { trpc } from '@/utils/trpc';
import { Role } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();

  // Запрос данных матча
  const { data: match, isLoading } = trpc.matches.byId.useQuery(params.id as string, {
    refetchOnWindowFocus: false,
    retry: false,
    onError: (error) => {
      if (error.data?.code === 'NOT_FOUND') {
        router.push('/matches');
      }
    },
  });

  // Мутация для удаления матча
  const { mutate: deleteMatch, isLoading: isDeleting } = trpc.matches.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Матч удален',
        description: 'Матч и вся связанная статистика были успешно удалены',
      });
      router.push('/matches');
    },
    onError: (error) => {
      toast({
        title: 'Ошибка при удалении',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Проверка прав на редактирование/удаление
  const canChange =
    session?.user.role === Role.ADMIN || (session?.user.role === Role.MODERATOR && match?.isLast);

  // Обработчик удаления матча
  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить этот матч? Это действие нельзя отменить.')) {
      deleteMatch(match!.id);
    }
  };

  // Обработка состояния загрузки
  if (isLoading) {
    return <MatchLoading />;
  }

  // Обработка отсутствия данных
  if (!match) {
    return <MatchNotFound />;
  }

  // Приводим данные JSON к нужным типам
  const typedPlayers = match.players.map((player) => ({
    ...player,
    damageDealt: player.damageDealt as DamageDealt,
    damageReceived: player.damageReceived as DamageReceived,
    divisions: player.divisions as Divisions,
  }));

  return (
    <div className="container max-w-screen-xl py-8 space-y-8">
      {/* Заголовок матча */}
      <MatchHeader
        id={match.id}
        createdAt={match.createdAt}
        mode={match.mode}
        isRated={match.isRated}
        totalScore={match.totalScore}
        actionButtons={
          canChange && (
            <MatchActionButtons
              matchId={match.id}
              isDeleting={isDeleting}
              onDelete={handleDelete}
            />
          )
        }
      />

      {/* Статистика игроков */}
      <div className="relative">
        <PlayerStatsDisplay players={typedPlayers} sessionUserId={session?.user.id} />
      </div>

      {/* Детали матча */}
      <MatchDetails
        creator={match.creator}
        createdAt={match.createdAt}
        mode={match.mode}
        isRated={match.isRated}
      />
    </div>
  );
}
