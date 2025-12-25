import { Queue, Stats, User } from '@prisma/client';


export function formatQueueInfo(
  queue: (Queue & { players: (User & { stats: Stats | null })[] }) | null
) {
  if (!queue) {
    return 'Очередь пуста';
  }

  const { players, botsCount, gameType } = queue;
  
  // Определяем количество требуемых игроков
  let requiredPlayers: number;
  if (gameType === 'TWO_VS_TWO' || gameType === 'TWO_VS_TWO_HIGH_MMR') {
    requiredPlayers = 4;
  } else {
    requiredPlayers = 6; // THREE_VS_THREE, THREE_VS_THREE_HIGH_MMR, TWO_VS_TWO_VS_TWO
  }
  
  const currentPlayers = players.length + botsCount;

  // Определяем текст типа игры
  let gameTypeText: string;
  switch (gameType) {
    case 'THREE_VS_THREE':
      gameTypeText = '3x3';
      break;
    case 'THREE_VS_THREE_HIGH_MMR':
      gameTypeText = '3x3 (High MMR)';
      break;
    case 'TWO_VS_TWO':
      gameTypeText = '2x2';
      break;
    case 'TWO_VS_TWO_HIGH_MMR':
      gameTypeText = '2x2 (High MMR)';
      break;
    case 'TWO_VS_TWO_VS_TWO':
      gameTypeText = '2x2x2';
      break;
    default:
      gameTypeText = 'Неизвестный режим';
  }

  let info = `Тип игры: ${gameTypeText}\n`;
  info += `Игроков в очереди: ${currentPlayers}/${requiredPlayers}\n\n`;

  if (players.length > 0) {
    info += 'Игроки:\n';
    players.forEach((player, index) => {
      info += `${index + 1}. ${player.name} (${player.stats?.rating || 1800})\n`;
    });
  }

  if (botsCount > 0) {
    info += `\nБотов: ${botsCount}`;
  }

  return info;
}
