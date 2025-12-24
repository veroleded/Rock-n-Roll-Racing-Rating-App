import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Проверка подписи запроса от бота.
 *
 * Схема подписи: HMAC-SHA256(BOT_SECRET_KEY, `${timestamp}.${body}`) в hex.
 * - `timestamp` должен быть не старше 5 минут
 * - `body` должен совпадать с тем, что подписывал отправитель (обычно JSON строки)
 */
export function verifyBotSignature(timestamp: string, signature: string, body: string = ''): boolean {
  try {
    const secret = process.env.BOT_SECRET_KEY || '';
    if (!secret) return false;

    const timestampMs = parseInt(timestamp, 10);
    if (Number.isNaN(timestampMs) || Date.now() - timestampMs > 5 * 60 * 1000) {
      return false;
    }

    const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

    // Сравнение в константное время
    const a = Buffer.from(signature, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}


