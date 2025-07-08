import { prisma } from '@/lib/prisma';
import { UsersService } from '@/server/services/users/users.service';
import { EmbedBuilder, Message } from 'discord.js';
import dotenv from 'dotenv';
import { COLORS } from '../constants/colors';
import { EMOJIS } from '../constants/emojis';
import { MESSAGES } from '../constants/messages';
import { Command } from '../types/command';
import { createEmbed } from '../utils/embeds';

dotenv.config();

const APP_URL =
  process.env.NODE_ENV === 'production' ? (process.env.APP_URL ?? '') : 'http://80.76.34.54';

const usersService = new UsersService(prisma);

export const rankCommand: Command = {
  name: 'rank',
  description: 'Показывает позицию игрока в рейтинге и соседей',
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
        const neighbors = await usersService.getUserWithNeighbors(discordId);

        if (neighbors.length === 0) {
          await message.reply({
            embeds: [createEmbed.error('Ошибка', MESSAGES.ERROR.USER_NOT_FOUND)],
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(COLORS.PRIMARY)
          .setTitle(`${EMOJIS.TROPHY} Рейтинг игрока и соседи`)
          .setDescription(`[Перейти к списку игроков](${APP_URL}/users)`)
          .setTimestamp();

        const fields = neighbors.map((player) => {
          const rating = player.stats?.rating || 0;
          const minRating = player.stats?.minRating || 0;
          const maxRating = player.stats?.maxRating || 0;
          const wins = player.stats?.wins || 0;
          const losses = player.stats?.losses || 0;
          const draws = player.stats?.draws || 0;
          const gamesPlayed = wins + losses + draws;
          const divs = player.stats?.totalDivisions || 0;
          const score = player.stats?.totalScore || 0;
          const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
          const rank = player.rank;

          let rankIcon = '';
          if (rank === 1) rankIcon = '🥇';
          else if (rank === 2) rankIcon = '🥈';
          else if (rank === 3) rankIcon = '🥉';
          else rankIcon = `${rank}`;

          const namePrefix = player.id === discordId ? '➡️ ' : '';

          return {
            name: `${namePrefix}${rankIcon} ${player.name}`,
            value: `• Rating: ${rating} (${maxRating}→${minRating})
• Games: ${gamesPlayed}, Divs: ${divs}, Winrate: ${winRate}%
• Wins: ${wins}, Losses: ${losses}, Draws: ${draws}
• Score: ${score}`,
            inline: false,
          };
        });

        embed.addFields(fields);
        await message.reply({ embeds: [embed] });
      } catch (error) {
        console.error('Ошибка при получении списка игроков:', error);
        await message.reply({
          embeds: [createEmbed.error('Ошибка', MESSAGES.ERROR.GENERAL)],
        });
      }
    } catch (error) {
      console.error('Ошибка в команде !rank:', error);
      await message.reply({
        embeds: [createEmbed.error('Ошибка', MESSAGES.ERROR.GENERAL)],
      });
    }
  },
};
