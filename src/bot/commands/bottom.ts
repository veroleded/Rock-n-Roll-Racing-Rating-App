import { prisma } from '@/lib/prisma';
import { UsersService } from '@/server/services/users/users.service';
import { EmbedBuilder, Message } from 'discord.js';
import { COLORS } from '../constants/colors';
import { EMOJIS } from '../constants/emojis';
import { MESSAGES } from '../constants/messages';
import { Command } from '../types/command';
import { createEmbed } from '../utils/embeds';

export const bottomCommand: Command = {
  name: 'bottom',
  description: 'Показывает последние 10 человек в рейтинге',
  execute: async (message: Message) => {
    try {
      const usersService = new UsersService(prisma);
      const { users: bottomPlayers, total } = await usersService.getTopUsers('end');

      if (!bottomPlayers || bottomPlayers.length === 0) {
        await message.reply({
          embeds: [createEmbed.info('Нет игроков', 'На данный момент нет игроков в рейтинге.')],
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`${EMOJIS.TROPHY} Последние 10 игроков`)
        .setTimestamp();

      const fields = bottomPlayers.reverse().map((player, index) => {
        const position = total - bottomPlayers.length + index + 1;
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

        return {
          name: `${position}. ${player.name}`,
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
      console.error('Ошибка в команде !bottom:', error);
      await message.reply({
        embeds: [createEmbed.error('Ошибка', MESSAGES.ERROR.GENERAL)],
      });
    }
  },
};
