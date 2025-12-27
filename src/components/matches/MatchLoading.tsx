'use client';

import { useI18n } from '@/lib/i18n/context';
import React from 'react';

export const MatchLoading: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
    </div>
  );
};

export const MatchNotFound: React.FC = () => {
  const { t } = useI18n();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-4xl font-bold">{t('common.matchNotFound')}</h1>
      <p className="text-muted-foreground">{t('common.matchNotFoundDescription')}</p>
    </div>
  );
};
