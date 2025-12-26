import { getVersion } from '@/lib/version';

/**
 * Единое место для получения базового URL веб-приложения для ссылок в Discord-боте.
 *
 * - В `production` для версии `bogdan` используем домен rocknrollracing.online
 * - В `production` для версии `fedor` используем `APP_URL` из env (IP адрес)
 * - В `development` берём `APP_URL` из env, либо используем localhost по умолчанию
 *
 * Нормализуем: убираем завершающий `/`, чтобы ссылки вида `${APP_URL}/path` не давали `//`.
 */
export function getAppUrl(): string {
  let raw: string | undefined;

  if (process.env.NODE_ENV === 'production') {
    const version = getVersion();
    if (version === 'bogdan') {
      // Для версии bogdan используем домен
      raw = 'https://rocknrollracing.online';
    } else {
      // Для версии fedor используем APP_URL из env (IP адрес)
      raw = process.env.APP_URL;
    }
  } else {
    // В development используем APP_URL из env или localhost
    raw = process.env.APP_URL ?? 'http://localhost:3000';
  }

  return (raw ?? '').replace(/\/+$/, '');
}
