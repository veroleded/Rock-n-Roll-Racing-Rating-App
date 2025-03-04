/**
 * Типы для JSON полей в модели MatchPlayer
 */

/**
 * Тип для поля damageDealt в модели MatchPlayer
 * Представляет собой объект, где ключи - это ID пользователей,
 * а значения - объекты с информацией о нанесенном уроне
 */
export type DamageDealt = Record<string, {
  isAlly: boolean;
  damage: number;
}>;

/**
 * Тип для поля damageReceived в модели MatchPlayer
 * Представляет собой объект, где ключи - это ID пользователей,
 * а значения - объекты с информацией о полученном уроне
 */
export type DamageReceived = Record<string, {
  isAlly: boolean;
  damage: number;
}>;

/**
 * Тип для поля divisions в модели MatchPlayer
 * Представляет собой объект, где ключи - это ID дивизионов,
 * а значения - объекты со статистикой
 */
export type Divisions = Record<string, {
  scores: number;
  result: 'WIN' | 'LOSS' | 'DRAW';
}>;

// Расширяем типы Prisma с использованием модульного подхода
declare module '@prisma/client' {
  interface PrismaJsonTypes {
    damageDealt: DamageDealt;
    damageReceived: DamageReceived;
    divisions: Divisions;
  }
} 