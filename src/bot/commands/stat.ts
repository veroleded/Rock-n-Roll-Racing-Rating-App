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
      // Получаем ID пользователя
      const content = message.content.trim();
      let discordId = message.author.id;

      // Если указан другой пользователь
      if (content.length > 5) {
        // !stat + пробел + ID
        const mentionedId = content.slice(6).trim();
        if (mentionedId) {
          discordId = mentionedId;
        }
      }

      try {
        // Получаем информацию о пользователе
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

        // Получаем предыдущий рейтинг (заглушка)
        const prevRating = user.stats.rating - Math.floor(Math.random() * 300);
        const newRating = user.stats.rating;

        // Формируем сообщение со статистикой
        const totalGames = user.stats.wins + user.stats.losses + user.stats.draws;
        const winRate = Math.round((user.stats.wins / (totalGames || 1)) * 100);

        // Заглушки для данных о дивизионах и очках
        const divTotal = 2178;
        const divWon = 1090;
        const divLost = 968;
        const divDraw = 120;
        const totalScores = 3216738;

        const embed = createEmbed.stats(user).addFields(
          {
            name: '👑 Ранг',
            value: `Место: ${userRank}${rankSuffix}\nРейтинг: ${newRating}\nИзменение: ${prevRating} → ${newRating}`,
            inline: false,
          },
          {
            name: '🎮 Игры',
            value: `Всего игр: ${totalGames}\nПобед: ${user.stats.wins}\nПоражений: ${user.stats.losses}\nНичьих: ${user.stats.draws}\nПроцент побед: ${winRate}%`,
            inline: false,
          },
          {
            name: '🏆 Дивизионы',
            value: `Всего: ${divTotal}\nПобед: ${divWon}\nПоражений: ${divLost}\nНичьих: ${divDraw}`,
            inline: false,
          },
          {
            name: '📊 Очки',
            value: `Всего очков: ${totalScores}`,
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
