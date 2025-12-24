/**
 * Единое место для получения базового URL веб-приложения для ссылок в Discord-боте.
 *
 * - В `production` ожидаем корректный `APP_URL` (например, https://example.com)
 * - В `development` берём `APP_URL` из env, либо используем localhost по умолчанию
 *
 * Нормализуем: убираем завершающий `/`, чтобы ссылки вида `${APP_URL}/path` не давали `//`.
 */
export function getAppUrl(): string {
  const raw =
    process.env.NODE_ENV === 'production'
      ? process.env.APP_URL
      : (process.env.APP_URL ?? 'http://localhost:3000');

  return (raw ?? '').replace(/\/+$/, '');
}
