import dotenv from 'dotenv';

dotenv.config();

export type Version = 'bogdan' | 'fedor';

/**
 * Получает текущую версию из переменной окружения VERSION
 * По умолчанию используется 'bogdan'
 */
export function getVersion(): Version {
  const version = process.env.VERSION?.toLowerCase();
  return version === 'fedor' ? 'fedor' : 'bogdan';
}

/**
 * Получает префикс для каналов сбора на игру
 * - bogdan: 'сбор-на-игру' (с дефисом)
 * - fedor: 'сбор_на_игру' (с подчеркиванием)
 */
export function getGatheringPrefix(): string {
  const version = getVersion();
  return version === 'fedor' ? 'сбор_на_игру' : 'сбор-на-игру';
}

/**
 * Получает название канала для уведомлений о матчах
 * - bogdan: 'matchmaking'
 * - fedor: 'рейтинг'
 */
export function getMatchNotificationChannelName(): string {
  const version = getVersion();
  return version === 'fedor' ? 'рейтинг' : 'matchmaking';
}

/**
 * Получает название канала для типа игры
 * - bogdan: использует дефисы (сбор-на-игру-2x2)
 * - fedor: использует подчеркивания (сбор_на_игру_2x2)
 */
export function getGatheringChannelName(gameType: string): string {
  const version = getVersion();
  const separator = version === 'fedor' ? '_' : '-';

  const baseName = version === 'fedor' ? 'сбор_на_игру' : 'сбор-на-игру';

  switch (gameType) {
    case 'THREE_VS_THREE':
      return `${baseName}${separator}3x3`;
    case 'THREE_VS_THREE_HIGH_MMR':
      // Для fedor: сбор_на_игру_3x3_high_mmr, для bogdan: сбор-на-игру-3x3-high-mmr
      return version === 'fedor' ? `${baseName}_3x3_high_mmr` : `${baseName}-3x3-high-mmr`;
    case 'TWO_VS_TWO_VS_TWO':
      return `${baseName}${separator}2x2x2`;
    case 'TWO_VS_TWO_HIGH_MMR':
      // Для fedor: сбор_на_игру_2x2_high_mmr, для bogdan: сбор-на-игру-2x2-high-mmr
      return version === 'fedor' ? `${baseName}_2x2_high_mmr` : `${baseName}-2x2-high-mmr`;
    case 'TWO_VS_TWO':
      return `${baseName}${separator}2x2`;
    default:
      return `${baseName}${separator}2x2`;
  }
}
