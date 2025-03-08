import { Queue, Stats, User } from '@prisma/client';

// Вспомогательная функция для форматирования информации об очереди
export function formatQueueInfo(
  queue: (Queue & { players: (User & { stats: Stats | null })[] }) | null
) {
  if (!queue) {
    return 'Очередь пуста';
  }

  const { players, botsCount, gameType } = queue;
  const requiredPlayers = gameType === 'TWO_VS_TWO' ? 4 : 6;
  const currentPlayers = players.length + botsCount;

  let info = `Тип игры: ${
    gameType === 'THREE_VS_THREE' ? '3x3' : gameType === 'TWO_VS_TWO' ? '2x2' : '2x2x2'
  }\n`;
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
