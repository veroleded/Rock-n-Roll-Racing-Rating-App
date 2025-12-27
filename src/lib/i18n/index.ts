import ruMessages from './messages/ru.json';
import enMessages from './messages/en.json';
import type { Locale, Messages } from './types';

export type { Locale, Messages } from './types';
export const locales: Locale[] = ['ru', 'en'];
export const defaultLocale: Locale = 'ru';

export const messages: Record<Locale, Messages> = {
  ru: ruMessages as Messages,
  en: enMessages as Messages,
};

export function getLocaleFromStorage(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  const stored = localStorage.getItem('locale') as Locale | null;
  return stored && locales.includes(stored) ? stored : defaultLocale;
}

export function setLocaleInStorage(locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('locale', locale);
}

