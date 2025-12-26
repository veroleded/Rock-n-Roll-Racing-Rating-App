import { BackButton } from '@/components/BackButton';
import { Badge } from '@/components/ui/badge';
import { GameMode } from '@prisma/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Shield } from 'lucide-react';
import React from 'react';


export const gameModeNames: Record<GameMode, string> = {
  TWO_VS_TWO: '2 на 2',
  THREE_VS_THREE: '3 на 3',
  TWO_VS_TWO_VS_TWO: '2 на 2 на 2',
  TWO_VS_TWO_HIGH_MMR: '2 на 2', // High MMR отображается так же, как обычный вариант
  THREE_VS_THREE_HIGH_MMR: '3 на 3', // High MMR отображается так же, как обычный вариант
};

interface MatchHeaderProps {
  id: string;
  createdAt: Date;
  mode: GameMode;
  isRated: boolean;
  totalScore: string;
  actionButtons?: React.ReactNode;
}

export const MatchHeader: React.FC<MatchHeaderProps> = ({
  id,
  createdAt,
  mode,
  isRated,
  totalScore,
  actionButtons,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <BackButton />
          <h1 className="text-2xl sm:text-3xl font-bold">Матч #{id}</h1>
          {actionButtons}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-sm sm:text-base text-muted-foreground">
          <span>
            {format(new Date(createdAt), 'd MMMM yyyy, HH:mm', {
              locale: ru,
            })}
          </span>
          <span>•</span>
          <span>{gameModeNames[mode]}</span>
          {isRated && (
            <>
              <span>•</span>
              <Badge variant="secondary" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Рейтинговый
              </Badge>
            </>
          )}
        </div>
      </div>
      <div className="text-3xl sm:text-4xl font-bold text-center sm:text-right">{totalScore}</div>
    </div>
  );
};
