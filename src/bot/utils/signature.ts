import { createHmac } from 'crypto';

// Функция для создания подписи
export function createSignature(timestamp: string, body: string = ''): string {
  const BOT_SECRET_KEY = process.env.BOT_SECRET_KEY;
  const hmac = createHmac('sha256', BOT_SECRET_KEY || '');
  return hmac.update(`${timestamp}.${body}`).digest('hex');
}
