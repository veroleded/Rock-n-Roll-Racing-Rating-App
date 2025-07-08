'use client';

import { DamageMatrix } from '@/components/matches/DamageMatrix';
import { DivisionsStats } from '@/components/matches/DivisionsStats';
import { MatchActionButtons } from '@/components/matches/MatchActionButtons';
import { MatchDetails } from '@/components/matches/MatchDetails';
import { MatchHeader } from '@/components/matches/MatchHeader';
import { MatchLoading, MatchNotFound } from '@/components/matches/MatchLoading';
import { MatchStats } from '@/components/matches/MatchStats';
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

  const { data: match, isLoading } = trpc.matches.byId.useQuery(params?.id as string, {
    refetchOnWindowFocus: false,
    retry: false,
    onError: (error) => {
      if (error.data?.code === 'NOT_FOUND') {
        router.push('/matches');
      }
    },
  });

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

  const canChange =
    session?.user.role === Role.ADMIN || (session?.user.role === Role.MODERATOR && match?.isLast);

  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить этот матч? Это действие нельзя отменить.')) {
      deleteMatch(match!.id);
    }
  };

  if (isLoading) {
    return <MatchLoading />;
  }

  if (!match) {
    return <MatchNotFound />;
  }

  const typedPlayers = match.players.map((player) => ({
    ...player,
    damageDealt: player.damageDealt as DamageDealt,
    damageReceived: player.damageReceived as DamageReceived,
    divisions: player.divisions as Divisions,
  }));

  return (
    <div className="container mx-auto py-8 space-y-8">
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

      <div className="relative">
        <PlayerStatsDisplay players={typedPlayers} sessionUserId={session?.user.id} />
      </div>

      <MatchStats players={typedPlayers} />

      <DamageMatrix players={typedPlayers} />

      <DivisionsStats players={typedPlayers} />

      <MatchDetails
        creator={match.creator}
        createdAt={match.createdAt}
        mode={match.mode}
        isRated={match.isRated}
      />
    </div>
  );
}
