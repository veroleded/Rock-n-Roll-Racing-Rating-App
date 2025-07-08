import { prisma } from '@/lib/prisma';
import { UsersService } from '@/server/services/users/users.service';
import { Message } from 'discord.js';
import { MESSAGES } from '../constants/messages';
import { Command } from '../types/command';
import { createEmbed } from '../utils/embeds';

const usersService = new UsersService(prisma);

export const statCommand: Command = {
  name: 'stat',
  description: 'Показывает всю информацию про игрока',
  execute: async (message: Message) => {
    try {
      const content = message.content.trim();
      let discordId = message.author.id;

      if (content.length > 5) {
        const mentionedId = content.slice(6).trim();
        if (mentionedId) {
          discordId = mentionedId;
        }
      }

      try {
        const user = await usersService.getUserById(discordId);
        if (!user?.stats) {
          await message.reply({
            embeds: [
              createEmbed.info(
                'Нет статистики',
                `У пользователя ${user?.name || 'Неизвестный игрок'} еще нет статистики.`
              ),
            ],
          });
          return;
        }

        // Получаем всех пользователей для определения места в рейтинге
        const allUsers = await usersService.getUsers();

        // Сортируем пользователей по рейтингу
        const sortedUsers = allUsers
          .filter((u) => u.stats)
          .sort((a, b) => (b.stats?.rating || 0) - (a.stats?.rating || 0));

        // Находим место игрока в рейтинге
        const userRank = sortedUsers.findIndex((u) => u.id === user.id) + 1;
        const rankSuffix =
          userRank === 1 ? 'st' : userRank === 2 ? 'nd' : userRank === 3 ? 'rd' : 'th';

        // Формируем сообщение со статистикой
        const totalGames = user.stats.wins + user.stats.losses + user.stats.draws;
        const winRate = Math.round((user.stats.wins / (totalGames || 1)) * 100);

        const embed = createEmbed.stats(user).addFields(
          {
            name: '👑 Ранг',
            value: `Место: ${userRank}${rankSuffix}\nРейтинг: ${user.stats.rating}\nИзменение: ${user.stats.minRating} → ${user.stats.maxRating}`,
            inline: false,
          },
          {
            name: '🎮 Игры',
            value: `Всего игр: ${totalGames}\nПобед: ${user.stats.wins}\nПоражений: ${user.stats.losses}\nНичьих: ${user.stats.draws}\nПроцент побед: ${winRate}%`,
            inline: false,
          },
          {
            name: '🏆 Дивизионы',
            value: `Всего: ${user.stats.totalDivisions}\nПобед: ${user.stats.winsDivisions}\nПоражений: ${user.stats.lossesDivisions}\nНичьих: ${user.stats.drawsDivisions}`,
            inline: false,
          },
          {
            name: '📊 Очки',
            value: `Всего очков: ${user.stats.totalScore}`,
            inline: false,
          }
        );

        await message.reply({ embeds: [embed] });
      } catch {
        await message.reply({
          embeds: [createEmbed.error('Ошибка', MESSAGES.ERROR.USER_NOT_FOUND)],
        });
      }
    } catch (error) {
      console.error('Ошибка в команде !stat:', error);
      await message.reply({
        embeds: [createEmbed.error('Ошибка', MESSAGES.ERROR.GENERAL)],
      });
    }
  },
};
