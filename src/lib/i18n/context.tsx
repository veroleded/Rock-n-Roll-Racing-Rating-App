'use client';

import { getVersion } from '@/lib/version';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getLocaleFromStorage, messages, setLocaleInStorage } from './index';
import type { Locale } from './types';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) return path;
  }
  return typeof value === 'string' ? value : path;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const version = getVersion();
  const isFedor = version === 'fedor';

  // Для версии fedor всегда используем русский
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (isFedor) return 'ru';
    return getLocaleFromStorage();
  });

  useEffect(() => {
    if (isFedor) {
      setLocaleState('ru');
    } else {
      const storedLocale = getLocaleFromStorage();
      setLocaleState(storedLocale);
    }
  }, [isFedor]);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      if (isFedor) return; // Не позволяем менять язык для fedor
      setLocaleState(newLocale);
      setLocaleInStorage(newLocale);
    },
    [isFedor]
  );

  const t = useCallback(
    (key: string): string => {
      const localeMessages = messages[locale];
      return getNestedValue(localeMessages, key);
    },
    [locale]
  );

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
