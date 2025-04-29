import { MatchService } from '@/server/services/match/match.service';
import { Match, MatchPlayer, PrismaClient, Stats, User } from '@prisma/client';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { COLORS } from '../constants/colors';
import { EMOJIS } from '../constants/emojis';

// Тип для расширенных данных матча с игроками
type MatchWithPlayers = Match & {
  players: (MatchPlayer & {
    user: User & {
      stats: Stats | null;
    };
  })[];
};

export class MatchNotificationService {
  private lastMatchId: string | null = null;
  private readonly prisma: PrismaClient;
  private readonly discordClient: Client;

  constructor(prisma: PrismaClient, discordClient: Client) {
    this.prisma = prisma;
    this.discordClient = discordClient;
  }

  /**
   * Инициализация системы уведомлений
   */
  async initialize(): Promise<void> {
    try {
      const lastMatch = await this.prisma.match.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      if (lastMatch) {
        this.lastMatchId = lastMatch.id;
        console.log(`Инициализирован ID последнего матча: ${this.lastMatchId}`);
      } else {
        console.log('Матчей нет в базе данных при инициализации');
      }
    } catch (error) {
      console.error('Ошибка при инициализации ID последнего матча:', error);
    }
  }

  /**
   * Запуск планировщика проверки новых матчей
   * @param intervalMs Интервал проверки в миллисекундах
   */
  startChecker(intervalMs: number = 10000): void {
    setInterval(async () => {
      await this.checkForNewMatches();
    }, intervalMs);
  }

  /**
   * Проверка новых матчей
   */
  async checkForNewMatches(): Promise<void> {
    console.log('Проверка новых матчей');
    try {
      const matchService = new MatchService(this.prisma);

      // Получаем последний матч
      const lastMatch = await this.prisma.match.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      // Если нет матчей в базе данных
      if (!lastMatch) {
        console.log('Матчей нет в базе данных');
        return;
      }

      // Если это первый запуск, инициализируем его, но не отправляем уведомление
      if (this.lastMatchId === null) {
        console.log(`Первая инициализация ID последнего матча: ${lastMatch.id}`);
        this.lastMatchId = lastMatch.id;
        return;
      }

      // Если ID последнего матча не изменился
      if (this.lastMatchId === lastMatch.id) {
        console.log('Новых матчей нет');
        return;
      }

      // Если дошли до этой точки, значит есть новый матч
      console.log(`Найден новый матч. Старый ID: ${this.lastMatchId}, новый ID: ${lastMatch.id}`);

      // Получаем полную информацию о новом матче
      const newMatch = (await matchService.findById(lastMatch.id)) as MatchWithPlayers | null;

      if (!newMatch) {
        console.log('Не удалось получить информацию о новом матче');
        this.lastMatchId = lastMatch.id;
        return;
      }

      console.log(`Обнаружен новый матч: ${newMatch.id}`);

      // Проверяем, что матч рейтинговый
      if (!newMatch.isRated) {
        console.log('Матч не рейтинговый, пропускаем');
        this.lastMatchId = newMatch.id;
        return;
      }

      // Отправляем уведомление
      await this.sendMatchNotification(newMatch);

      // Обновляем ID последнего матча после успешной отправки уведомлений
      this.lastMatchId = newMatch.id;
      console.log(`ID последнего матча обновлен: ${this.lastMatchId}`);
    } catch (error) {
      console.error('Ошибка при проверке новых матчей:', error);
    }
  }

  /**
   * Отправка уведомления о новом матче
   * @param match Данные матча
   */
  private async sendMatchNotification(match: MatchWithPlayers): Promise<void> {
    // Находим канал "рейтинг" во всех гильдиях
    for (const guild of this.discordClient.guilds.cache.values()) {
      const ratingChannel = guild.channels.cache.find(
        (ch) => ch.name === 'рейтинг' && ch.type === 0
      );

      if (ratingChannel) {
        // Разделяем игроков на команды
        const [team1, team2] = this.separatePlayersByTeam(match.players);

        // Определяем победителей и проигравших
        const [scoreTeam1, scoreTeam2] = match.totalScore.split(' - ').map(Number);
        const isTeam1Winner = scoreTeam1 > scoreTeam2;
        const isDraw = scoreTeam1 === scoreTeam2;

        // Считаем суммы очков за матч для каждой команды
        const team1TotalScore = team1.reduce((sum, player) => sum + player.score, 0);
        const team2TotalScore = team2.reduce((sum, player) => sum + player.score, 0);
        const scoreDifference = Math.abs(team1TotalScore - team2TotalScore);

        // Добавление информации о командах
        const team1Content = this.formatTeamStats(team1, isDraw ? null : isTeam1Winner);
        const team2Content = this.formatTeamStats(team2, isDraw ? null : !isTeam1Winner);

        // Создаем эмбеды для каждой команды
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

        // Создаем основной эмбед с информацией о матче (внизу)
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
              value: `[Открыть детали матча](http://80.76.34.54:3000/matches/${match.id})`,
            },
          ])
          .setTimestamp();

        // Отправляем сообщения с эмбедами
        await (ratingChannel as TextChannel).send({ embeds: [team1Embed, team2Embed] });
        await (ratingChannel as TextChannel).send({ embeds: [resultEmbed] });
        break;
      }
    }
  }

  /**
   * Форматирование статистики команды
   * @param team Список игроков команды
   * @param isWinner Признак победителя (true - победитель, false - проигравший, null - ничья)
   * @returns Отформатированный текст со статистикой игроков команды
   */
  private formatTeamStats(
    team: (MatchPlayer & { user: User & { stats: Stats | null } })[],
    isWinner: boolean | null
  ): string {
    let content = '';

    // Выбираем иконку для команды
    const icon = isWinner === true ? EMOJIS.CROWN : isWinner === false ? '⚔️' : '🔹';

    // Формируем строки для каждого игрока
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

  /**
   * Разделение игроков на команды
   * @param players Список игроков
   * @returns Массив с двумя командами
   */
  private separatePlayersByTeam(
    players: (MatchPlayer & { user: User & { stats: Stats | null } })[]
  ): [
    (MatchPlayer & { user: User & { stats: Stats | null } })[],
    (MatchPlayer & { user: User & { stats: Stats | null } })[],
  ] {
    const team1 = players.filter((player) => player.team === 1);
    const team2 = players.filter((player) => player.team === 2);
    return [team1, team2];
  }

  /**
   * Получение эмодзи для режима игры
   * @param mode Режим игры
   * @returns Эмодзи, соответствующий режиму игры
   */
  private getGameModeEmoji(mode: string): string {
    switch (mode) {
      case 'TWO_VS_TWO':
        return '2️⃣';
      case 'THREE_VS_THREE':
        return '3️⃣';
      case 'TWO_VS_TWO_VS_TWO':
        return '6️⃣';
      default:
        return EMOJIS.GAME;
    }
  }

  /**
   * Получение названия режима игры на русском
   * @param mode Режим игры
   * @returns Название режима игры
   */
  private getGameModeName(mode: string): string {
    switch (mode) {
      case 'TWO_VS_TWO':
        return '2x2';
      case 'THREE_VS_THREE':
        return '3x3';
      case 'TWO_VS_TWO_VS_TWO':
        return '2x2x2';
      default:
        return 'Неизвестный режим';
    }
  }
}
