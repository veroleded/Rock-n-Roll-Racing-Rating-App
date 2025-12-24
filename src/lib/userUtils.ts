import { Role } from '@prisma/client';

/**
 * Преобразует роль пользователя в читаемый текст
 */
export function getRoleText(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return 'Администратор';
    case 'MODERATOR':
      return 'Модератор';
    case 'PLAYER':
      return 'Игрок';
    default:
      return role;
  }
}

/**
 * Вычисляет винрейт пользователя в процентах
 */
export function getWinRate(wins: number, gamesPlayed: number): string {
  if (!gamesPlayed || gamesPlayed === 0) return '0%';
  return `${((wins / gamesPlayed) * 100).toFixed(1)}%`;
}
