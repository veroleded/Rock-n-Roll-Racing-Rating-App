'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/context';
import { GameMode } from '@prisma/client';
import { format } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { User } from 'lucide-react';
import React from 'react';

interface Creator {
  id: string;
  name: string | null;
  image: string | null;
}

interface MatchDetailsProps {
  creator: Creator;
  createdAt: Date;
  mode: GameMode;
  isRated: boolean;
}

export const MatchDetails: React.FC<MatchDetailsProps> = ({
  creator,
  createdAt,
  mode,
  isRated,
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
    <Card>
      <CardHeader>
        <CardTitle>{t('common.matchDetails')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium">{t('common.creator')}</div>
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="h-6 w-6">
                <AvatarImage src={creator.image || ''} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span>{creator.name}</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">{t('common.creationDate')}</div>
            <div className="text-muted-foreground">
              {format(new Date(createdAt), 'd MMMM yyyy, HH:mm', {
                locale: dateLocale,
              })}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">{t('common.gameMode')}</div>
            <div className="text-muted-foreground">{getGameModeName(mode)}</div>
          </div>
          <div>
            <div className="text-sm font-medium">{t('common.matchType')}</div>
            <div className="text-muted-foreground">{isRated ? t('common.rated') : t('common.normal')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
