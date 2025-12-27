'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n/context';
import { getVersion } from '@/lib/version';
import { Languages } from 'lucide-react';

const languages = [
  { code: 'ru' as const, name: 'Русский', flag: '🇷🇺' },
  { code: 'en' as const, name: 'English', flag: '🇬🇧' },
];

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  const version = getVersion();
  const isFedor = version === 'fedor';

  // Не показываем переключатель для версии fedor
  if (isFedor) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title={t('common.toggleTheme')}>
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t('common.toggleTheme')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => setLocale(language.code)}
            className={locale === language.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
