'use client';

import { BackButton } from '@/components/BackButton';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/context';
import { GameMode } from '@prisma/client';
import { format } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { Shield } from 'lucide-react';
import React from 'react';

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
  const { t, locale } = useI18n();
  const dateLocale = locale === 'en' ? enUS : ru;

  const getGameModeName = (mode: GameMode): string => {
    switch (mode) {
      case 'TWO_VS_TWO':
      case 'TWO_VS_TWO_HIGH_MMR':
        return t('common.gameMode2v2');
      case 'THREE_VS_THREE':
      case 'THREE_VS_THREE_HIGH_MMR':
        return t('common.gameMode3v3');
      case 'TWO_VS_TWO_VS_TWO':
        return t('common.gameMode2v2v2');
      default:
        return mode;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <BackButton />
          <h1 className="text-2xl sm:text-3xl font-bold">
            {t('common.match')} #{id}
          </h1>
          {actionButtons}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-sm sm:text-base text-muted-foreground">
          <span>
            {format(new Date(createdAt), 'd MMMM yyyy, HH:mm', {
              locale: dateLocale,
            })}
          </span>
          <span>•</span>
          <span>{getGameModeName(mode)}</span>
          {isRated && (
            <>
              <span>•</span>
              <Badge variant="secondary" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                {t('common.rated')}
              </Badge>
            </>
          )}
        </div>
      </div>
      <div className="text-3xl sm:text-4xl font-bold text-center sm:text-right">{totalScore}</div>
    </div>
  );
};
