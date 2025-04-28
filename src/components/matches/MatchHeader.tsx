import { BackButton } from '@/components/BackButton';
import { Badge } from '@/components/ui/badge';
import { GameMode } from '@prisma/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Shield } from 'lucide-react';
import React from 'react';

// Типы режимов игры
export const gameModeNames = {
  TWO_VS_TWO: '2 на 2',
  THREE_VS_THREE: '3 на 3',
  TWO_VS_TWO_VS_TWO: '2 на 2 на 2',
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
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-3xl font-bold">Матч #{id}</h1>
          {actionButtons}
        </div>
        <div className="flex items-center gap-2 mt-2 text-muted-foreground">
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
              <Badge variant="secondary">
                <Shield className="w-3 h-3 mr-1" />
                Рейтинговый
              </Badge>
            </>
          )}
        </div>
      </div>
      <div className="text-4xl font-bold">{totalScore}</div>
    </div>
  );
};
