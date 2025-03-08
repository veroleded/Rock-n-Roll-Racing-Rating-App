import { Message } from 'discord.js';
import { MESSAGES } from '../constants/messages';
import { trpc } from '../trpc';
import { Command } from '../types/command';
import { createEmbed } from '../utils/embeds';

export const topCommand: Command = {
  name: 'top',
  description: 'Показывает первые 10 человек в рейтинге',
  execute: async (message: Message) => {
    try {
      const { users: topPlayers } = await trpc.users.getTop.query('start');

      if (!topPlayers || topPlayers.length === 0) {
        await message.reply({
          embeds: [createEmbed.info('Нет игроков', 'На данный момент нет игроков в рейтинге.')],
        });
        return;
      }

      const embed = createEmbed.top();

      const fields = topPlayers.map((player, index) => {
        const emoji = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][index];
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
          name: `${emoji} ${player.name}`,
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
      console.error('Ошибка в команде !top:', error);
      await message.reply({
        embeds: [createEmbed.error('Ошибка', MESSAGES.ERROR.GENERAL)],
      });
    }
  },
};
