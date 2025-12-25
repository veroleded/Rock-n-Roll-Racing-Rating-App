import {
  MatchEventType,
  MatchWithPlayers,
  subscribeToMatchEvents,
} from '@/server/services/match/match-events';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import { COLORS } from '../constants/colors';
import { EMOJIS } from '../constants/emojis';
import { getAppUrl } from '../utils/appUrl';

dotenv.config();

const APP_URL = getAppUrl();

export class MatchNotificationService {
  private readonly discordClient: Client;

  constructor(discordClient: Client) {
    this.discordClient = discordClient;
  }

  initialize(): void {
    console.log(`[MatchNotificationService] Подписываемся на события через Redis`);

    // Подписываемся на события через Redis pub/sub
    subscribeToMatchEvents(MatchEventType.MATCH_CREATED, async (match: MatchWithPlayers) => {
      console.log(`[MatchNotificationService] Получено событие о создании матча: ${match.id}`);
      await this.handleNewMatch(match);
    });

    console.log(`[MatchNotificationService] Инициализирован и слушает события через Redis`);
  }

  private async handleNewMatch(match: MatchWithPlayers): Promise<void> {
    console.log(
      `[MatchNotificationService] Обработка матча: ${match.id}, рейтинговый: ${match.isRated}`
    );

    // ВРЕМЕННО: отправляем уведомления для всех матчей (включая нерейтинговые) для проверки
    // TODO: Вернуть проверку if (!match.isRated) return; после тестирования

    try {
      await this.sendMatchNotification(match);
      console.log(
        `[MatchNotificationService] Уведомление о матче ${match.id} отправлено в Discord`
      );
    } catch (error) {
      console.error(
        `[MatchNotificationService] Ошибка при отправке уведомления о матче ${match.id}:`,
        error
      );
    }
  }

  private async sendMatchNotification(match: MatchWithPlayers): Promise<void> {
    for (const guild of this.discordClient.guilds.cache.values()) {
      const ratingChannel = guild.channels.cache.find(
        (ch) => ch.name === 'matchmaking' && ch.type === 0
      );

      if (ratingChannel) {
        const [team1, team2] = this.separatePlayersByTeam(match.players);

        const [scoreTeam1, scoreTeam2] = match.totalScore.split(' - ').map(Number);
        const isTeam1Winner = scoreTeam1 > scoreTeam2;
        const isDraw = scoreTeam1 === scoreTeam2;

        const team1TotalScore = team1.reduce((sum, player) => sum + player.score, 0);
        const team2TotalScore = team2.reduce((sum, player) => sum + player.score, 0);
        const scoreDifference = Math.abs(team1TotalScore - team2TotalScore);

        const team1Content = this.formatTeamStats(team1, isDraw ? null : isTeam1Winner);
        const team2Content = this.formatTeamStats(team2, isDraw ? null : !isTeam1Winner);

        const team1Embed = new EmbedBuilder()
          .setColor(isTeam1Winner ? COLORS.SUCCESS : isDraw ? COLORS.INFO : COLORS.ERROR)
          .setTitle(
            isDraw
              ? `${EMOJIS.INFO} Команда 1 (Ничья)`
              : isTeam1Winner
                ? `${EMOJIS.TROPHY} Команда 1 (Победители)`
                : `${EMOJIS.WARNING} Команда 1 (Проигравшие)`
          )
          .setDescription(team1Content);

        const team2Embed = new EmbedBuilder()
          .setColor(isTeam1Winner ? COLORS.ERROR : isDraw ? COLORS.INFO : COLORS.SUCCESS)
          .setTitle(
            isDraw
              ? `${EMOJIS.INFO} Команда 2 (Ничья)`
              : isTeam1Winner
                ? `${EMOJIS.WARNING} Команда 2 (Проигравшие)`
                : `${EMOJIS.TROPHY} Команда 2 (Победители)`
          )
          .setDescription(team2Content);

        const resultEmbed = new EmbedBuilder()
          .setColor(COLORS.PRIMARY)
          .setTitle(`${EMOJIS.TROPHY} Результаты матча ${this.getGameModeName(match.mode)}`)
          .addFields([
            {
              name: `${EMOJIS.STAR} Счет матча`,
              value: match.totalScore,
            },
            {
              name: `${EMOJIS.CHART} Разница в очках`,
              value: scoreDifference.toString(),
            },
            {
              name: `${EMOJIS.LINK} Ссылка на матч`,
              value: `[Открыть детали матча](${APP_URL}/matches/${match.id})`,
            },
          ])
          .setTimestamp();

        await (ratingChannel as TextChannel).send({ embeds: [team1Embed, team2Embed] });
        await (ratingChannel as TextChannel).send({ embeds: [resultEmbed] });
        break;
      }
    }
  }

  private formatTeamStats(team: MatchWithPlayers['players'], isWinner: boolean | null): string {
    let content = '';

    const icon = isWinner === true ? EMOJIS.CROWN : isWinner === false ? '⚔️' : '🔹';

    for (const player of team) {
      if (player.userId.startsWith('bot_')) continue;

      const oldRating = player.user.stats ? player.user.stats.rating - player.ratingChange : 0;
      const newRating = player.user.stats ? player.user.stats.rating : 0;
      const ratingChangeIcon = player.ratingChange >= 0 ? '📈' : '📉';

      content += `${icon} <@${player.userId}>\n`;
      content += `Рейтинг: ${oldRating.toFixed(2)} → ${newRating.toFixed(2)} ${ratingChangeIcon} (${player.ratingChange >= 0 ? '+' : ''}${player.ratingChange.toFixed(2)})\n`;
    }

    return content || 'Нет данных о игроках';
  }

  private separatePlayersByTeam(
    players: MatchWithPlayers['players']
  ): [MatchWithPlayers['players'], MatchWithPlayers['players']] {
    const team1 = players.filter((player) => player.team === 1);
    const team2 = players.filter((player) => player.team === 2);
    return [team1, team2];
  }

  private getGameModeEmoji(mode: string): string {
    switch (mode) {
      case 'TWO_VS_TWO':
      case 'TWO_VS_TWO_HIGH_MMR':
        return '2️⃣';
      case 'THREE_VS_THREE':
      case 'THREE_VS_THREE_HIGH_MMR':
        return '3️⃣';
      case 'TWO_VS_TWO_VS_TWO':
        return '6️⃣';
      default:
        return EMOJIS.GAME;
    }
  }

  private getGameModeName(mode: string): string {
    switch (mode) {
      case 'TWO_VS_TWO':
      case 'TWO_VS_TWO_HIGH_MMR':
        return '2x2';
      case 'THREE_VS_THREE':
      case 'THREE_VS_THREE_HIGH_MMR':
        return '3x3';
      case 'TWO_VS_TWO_VS_TWO':
        return '2x2x2';
      default:
        return 'Неизвестный режим';
    }
  }
}
