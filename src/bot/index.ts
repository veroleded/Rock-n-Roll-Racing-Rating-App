import type { AppRouter } from "@/server/root";
import type { Queue, Stats, User } from '@prisma/client';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { createHmac } from 'crypto';
import {
  Client,
  ColorResolvable,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  Message,
  TextChannel,
} from 'discord.js';
import * as dotenv from 'dotenv';
import superjson from 'superjson';

// Загружаем переменные окружения
dotenv.config();

const BOT_SECRET_KEY = process.env.BOT_SECRET_KEY;
const APP_URL =
  process.env.NODE_ENV === 'production' ? (process.env.APP_URL ?? '') : 'http://localhost:3000';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// Создаем клиент tRPC
const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${APP_URL}/api/trpc`,
    }),
  ],
  transformer: superjson,
});

// Функция для создания подписи
function createSignature(timestamp: string, body: string = ''): string {
  const hmac = createHmac('sha256', BOT_SECRET_KEY || '');
  return hmac.update(`${timestamp}.${body}`).digest('hex');
}

// Создаем клиент Discord с необходимыми разрешениями
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Константы для эмодзи
const EMOJIS = {
  SUCCESS: '✅',
  ERROR: '❌',
  INFO: 'ℹ️',
  WARNING: '⚠️',
  LINK: '🌐',
  CROWN: '👑',
  STAR: '⭐',
  MEDAL: '🏅',
  TROPHY: '🏆',
  CHART: '📊',
  GAME: '🎮',
  TIME: '⏰',
} as const;

// Константы для сообщений
const MESSAGES = {
  ERROR: {
    COMMAND_FAILED: (command: string) =>
      `${EMOJIS.ERROR} Произошла ошибка при выполнении команды \`${command}\`\n` +
      `Пожалуйста, попробуйте позже или обратитесь к администратору.`,
    USER_NOT_FOUND: `${EMOJIS.ERROR} Пользователь не найден в базе данных.`,
    GENERAL: `${EMOJIS.ERROR} Произошла непредвиденная ошибка. Пожалуйста, попробуйте позже.`,
    WRONG_CHANNEL_GATHERING: `${EMOJIS.ERROR} Эта команда работает только в каналах сбора на игру.`,
    WRONG_CHANNEL_STANDARD: `${EMOJIS.ERROR} Эта команда не работает в каналах сбора на игру.`,
  },
  SUCCESS: {
    ALREADY_JOINED: (appUrl: string) =>
      `${EMOJIS.INFO} Вы уже присоединились к боту!\n` +
      `${EMOJIS.LINK} Войдите в веб-приложение: ${appUrl}`,
    JOIN_BOT: (appUrl: string) =>
      `${EMOJIS.SUCCESS} Вы успешно присоединились!\n` +
      `${EMOJIS.LINK} Войдите в веб-приложение: ${appUrl}`,
    USER_UPDATED: (username: string) =>
      `${EMOJIS.SUCCESS} Данные пользователя ${username} успешно обновлены.`,
  },
  HELP: {
    HEADER: `${EMOJIS.INFO} **Доступные команды:**\n\n`,
    COMMAND: (name: string, description: string) => `${EMOJIS.GAME} \`!${name}\` - ${description}`,
  },
  STATS: {
    NO_STATS: (username: string) => `${EMOJIS.INFO} У пользователя ${username} еще нет статистики.`,
    HEADER: (username: string) => `${EMOJIS.TROPHY} **Статистика игрока ${username}**\n\n`,
  },
} as const;

// Константы для цветов
const COLORS = {
  PRIMARY: '#5865F2' as ColorResolvable,
  SUCCESS: '#57F287' as ColorResolvable,
  ERROR: '#ED4245' as ColorResolvable,
  WARNING: '#FEE75C' as ColorResolvable,
  INFO: '#5865F2' as ColorResolvable,
} as const;

// Утилиты для создания embed сообщений
const createEmbed = {
  success: (title: string, description?: string) => {
    return new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle(`${EMOJIS.SUCCESS} ${title}`)
      .setDescription(description || '')
      .setTimestamp();
  },
  error: (title: string, description?: string) => {
    return new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle(`${EMOJIS.ERROR} ${title}`)
      .setDescription(description || '')
      .setTimestamp();
  },
  info: (title: string, description?: string) => {
    return new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`${EMOJIS.INFO} ${title}`)
      .setDescription(description || '')
      .setTimestamp();
  },
  warning: (title: string, description?: string) => {
    return new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle(`${EMOJIS.WARNING} ${title}`)
      .setDescription(description || '')
      .setTimestamp();
  },
  stats: (user: User & { stats: Stats | null }) => {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`${EMOJIS.TROPHY} Статистика игрока ${user.name}`)
      .setThumbnail(user.image || null)
      .setTimestamp();
    return embed;
  },
  top: () => {
    return new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`${EMOJIS.TROPHY} ТОП-10 ИГРОКОВ`)
      .setTimestamp();
  },
  help: () => {
    return new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`${EMOJIS.INFO} Список команд`)
      .setTimestamp();
  },
} as const;

// Интерфейс для команд
interface Command {
  name: string;
  description: string;
  execute: (message: Message) => Promise<void>;
}

// Класс для управления командами
class CommandHandler {
  private commands: Map<string, Command> = new Map();

  // Проверка и обновление данных пользователя
  private async checkAndUpdateUserData(message: Message): Promise<void> {
    try {
      // Получаем текущий аватар и имя пользователя
      const currentAvatar = message.author.avatar
        ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png`
        : 'https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png';

      const currentUsername = message.author.globalName || message.author.username;

      // Получаем текущие данные пользователя из базы
      const userData = await trpc.users.byId.query(message.author.id);

      // Проверяем, нужно ли обновление
      if (userData && (userData.image !== currentAvatar || userData.name !== currentUsername)) {
        const updateData = {
          userId: message.author.id,
          username: currentUsername,
          avatar: currentAvatar,
        };

        const updateTimestamp = Date.now().toString();
        const updateSignature = createSignature(updateTimestamp, JSON.stringify(updateData));

        // Обновляем данные пользователя
        await trpc.auth.updateUserData.mutate({
          ...updateData,
          timestamp: updateTimestamp,
          signature: updateSignature,
        });

        console.log(`Обновлены данные пользователя ${currentUsername}`);
      }
    } catch (error) {
      console.error('Ошибка при обновлении данных пользователя:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  register(command: Command) {
    this.commands.set(command.name.toLowerCase(), command);
  }

  async handleMessage(message: Message) {
    // Игнорируем сообщения от ботов
    if (message.author.bot) return;

    // Проверяем, является ли сообщение командой
    if (!message.content.startsWith('!')) return;

    await this.checkAndUpdateUserData(message);

    // Разбиваем сообщение на команду и аргументы
    const args = message.content.slice(1).trim().split(/ +/);
    const rawCommandName = args.shift();

    if (!rawCommandName) return;

    const commandName = rawCommandName.toLowerCase();

    // Ищем команду
    const command = this.commands.get(commandName);
    if (!command) return;

    // Выполняем команду
    try {
      await command.execute(message);
    } catch (error) {
      console.error(`Ошибка выполнения команды ${commandName}:`, {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      await message.reply(MESSAGES.ERROR.COMMAND_FAILED(commandName));
    }
  }

  // Получение списка всех команд
  getCommands(): Command[] {
    return Array.from(this.commands.values());
  }
}

// Создаем обработчик команд
const commandHandler = new CommandHandler();

// Регистрируем команду !join
commandHandler.register({
  name: 'join',
  description: 'Присоединиться к боту',
  execute: async (message) => {
    const timestamp = Date.now().toString();

    // Сначала проверяем, не присоединился ли уже пользователь
    const statusCheck = await trpc.auth.checkBotStatus.query({
      userId: message.author.id,
      timestamp,
      signature: createSignature(timestamp),
    });

    if (statusCheck.hasJoinedBot) {
      await message.reply({
        embeds: [
          createEmbed.info(
            'Вы уже присоединились!',
            `${EMOJIS.LINK} Войдите в веб-приложение: ${APP_URL}`
          ),
        ],
      });
      return;
    }

    // Получаем аватар пользователя
    const avatar = message.author.avatar
      ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png`
      : 'https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png';

    // Получаем имя пользователя
    const username = message.author.globalName || message.author.username;

    // Подготавливаем данные для запроса
    const joinData = {
      userId: message.author.id,
      username,
      avatar,
    };

    // Создаем новую временную метку для запроса присоединения
    const joinTimestamp = Date.now().toString();
    const joinSignature = createSignature(joinTimestamp, JSON.stringify(joinData));

    // Отправляем запрос на присоединение
    await trpc.auth.joinBot.mutate({
      ...joinData,
      timestamp: joinTimestamp,
      signature: joinSignature,
    });

    await message.reply({
      embeds: [
        createEmbed.success(
          'Успешное присоединение!',
          `${EMOJIS.LINK} Войдите в веб-приложение: ${APP_URL}`
        ),
      ],
    });
  },
});

// Регистрируем команду !help
commandHandler.register({
  name: 'help',
  description: 'Показать список доступных команд',
  execute: async (message) => {
    const commands = commandHandler.getCommands();
    const embed = createEmbed.help();

    const commandsList = commands
      .map((cmd) => `${EMOJIS.GAME} !${cmd.name} - ${cmd.description}`)
      .join('\n');

    embed.setDescription(commandsList);

    await message.reply({ embeds: [embed] });
  },
});

// Регистрируем команду !stat
commandHandler.register({
  name: 'stat',
  description: 'Показывает всю информацию про игрока',
  execute: async (message) => {
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
        const user = await trpc.users.byId.query(discordId);
        if (!user.stats) {
          await message.reply({
            embeds: [
              createEmbed.info(
                'Нет статистики',
                `У пользователя ${user.name || 'Неизвестный игрок'} еще нет статистики.`
              ),
            ],
          });
          return;
        }
        console.log(user);

        // Получаем всех пользователей для определения места в рейтинге
        const allUsers = await trpc.users.list.query();

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

        // Формируем сообщение со статистикой согласно формату на изображении
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
        await message.reply(MESSAGES.ERROR.USER_NOT_FOUND);
      }
    } catch (error) {
      console.error('Ошибка в команде !stat:', error);
      await message.reply({
        embeds: [createEmbed.error('Ошибка', MESSAGES.ERROR.GENERAL)],
      });
    }
  },
});

// Регистрируем команду !top
commandHandler.register({
  name: 'top',
  description: 'Показывает первые 10 человек в рейтинге',
  execute: async (message) => {
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
});

// Регистрируем команду !bottom
commandHandler.register({
  name: 'bottom',
  description: 'Показывает последние 10 человек в рейтинге',
  execute: async (message) => {
    try {
      const { users: bottomPlayers, total } = await trpc.users.getTop.query('end');

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
});

// Регистрируем команду !rank
commandHandler.register({
  name: 'rank',
  description: 'Показывает позицию игрока в рейтинге и соседей',
  execute: async (message) => {
    try {
      // Получаем ID пользователя
      const content = message.content.trim();
      let discordId = message.author.id;

      // Если указан другой пользователь
      if (content.length > 5) {
        // !rank + пробел + ID
        const mentionedId = content.slice(6).trim();
        if (mentionedId) {
          discordId = mentionedId;
        }
      }

      try {
        const neighbors = await trpc.users.getUserWithNeighbors.query(discordId);

        if (neighbors.length === 0) {
          await message.reply({
            embeds: [createEmbed.error('Ошибка', MESSAGES.ERROR.USER_NOT_FOUND)],
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(COLORS.PRIMARY)
          .setTitle(`${EMOJIS.TROPHY} Рейтинг игрока и соседи`)
          .setTimestamp();

        const fields = neighbors.map((player, index) => {
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
          const rank = index + 1;

          // Определяем ранговую иконку
          let rankIcon = '';
          if (rank === 1) rankIcon = '🥇';
          else if (rank === 2) rankIcon = '🥈';
          else if (rank === 3) rankIcon = '🥉';
          else rankIcon = `${rank}`;

          // Если это целевой пользователь - добавляем указатель
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
});

// Константы для каналов сбора на игру
const GAME_GATHERING_PREFIX = 'сбор_на_игру';

// Команды для каналов сбора
const GATHERING_COMMANDS = {
  JOIN: '++',
  JOIN_BOT: '+bot',
  LEAVE: '--',
  LEAVE_BOT: '-bot',
  CLEAN: 'clean',
  HELP: 'help',
} as const;

// Описания команд для каналов сбора
const GATHERING_COMMANDS_DESCRIPTIONS = new Map([
  [GATHERING_COMMANDS.JOIN, 'Присоединиться к очереди'],
  [GATHERING_COMMANDS.JOIN_BOT, 'Добавить бота в очередь'],
  [GATHERING_COMMANDS.LEAVE, 'Покинуть очередь'],
  [GATHERING_COMMANDS.LEAVE_BOT, 'Удалить бота из очереди'],
  [GATHERING_COMMANDS.CLEAN, 'Очистить текущую очередь'],
  [GATHERING_COMMANDS.HELP, 'Показать список доступных команд'],
]);

// Вспомогательная функция для форматирования информации об очереди
function formatQueueInfo(queue: (Queue & { players: (User & { stats: Stats | null })[] }) | null) {
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

// Обработчик сообщений
client.on(Events.MessageCreate, async (message) => {
  // Игнорируем сообщения от ботов
  if (message.author.bot) return;

  // Проверяем, что это не личное сообщение и канал текстовый
  if (!message.guild || !(message.channel instanceof TextChannel)) return;

  const channelName = message.channel.name;
  const isGatheringChannel = channelName.startsWith(GAME_GATHERING_PREFIX);
  const content = message.content.trim();

  // Обработка команд в каналах сбора
  if (isGatheringChannel) {
    // Если пытаются использовать стандартные команды в канале сбора
    if (content.startsWith('!')) {
      await message.reply({
        embeds: [createEmbed.error('Неверный канал', MESSAGES.ERROR.WRONG_CHANNEL_STANDARD)],
      });
      return;
    }

    if (
      content === GATHERING_COMMANDS.JOIN ||
      content === GATHERING_COMMANDS.JOIN_BOT ||
      content === GATHERING_COMMANDS.LEAVE ||
      content === GATHERING_COMMANDS.LEAVE_BOT ||
      content === GATHERING_COMMANDS.CLEAN ||
      content === GATHERING_COMMANDS.HELP
    ) {
      try {
        const timestamp = Date.now().toString();

        if (content === GATHERING_COMMANDS.HELP) {
          const embed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setTitle(`${EMOJIS.INFO} Команды для сбора игроков`)
            .setDescription(
              Array.from(GATHERING_COMMANDS_DESCRIPTIONS.entries())
                .map(([command, description]) => `${EMOJIS.GAME} \`${command}\` - ${description}`)
                .join('\n')
            )
            .setTimestamp();

          await message.reply({ embeds: [embed] });
          return;
        }

        if (content === GATHERING_COMMANDS.CLEAN) {
          try {
            await trpc.queues.cleanQueue.mutate({
              channelName: channelName,
              timestamp,
              signature: createSignature(timestamp, JSON.stringify({ channelName })),
            });

            await message.reply({
              embeds: [createEmbed.success('Очередь очищена', 'Очередь была успешно очищена.')],
            });
            return;
          } catch (error: unknown) {
            if (typeof error === 'object' && error !== null && 'message' in error) {
              const errorMessage = (error as { message: string }).message;
              if (errorMessage === 'Очередь не найдена') {
                await message.reply({
                  embeds: [createEmbed.error('Ошибка', 'В данный момент нет активной очереди')],
                });
                return;
              }
            }
            throw error;
          }
        }

        if (content === GATHERING_COMMANDS.JOIN) {
          try {
            // Проверяем, присоединился ли пользователь к боту
            const statusCheck = await trpc.auth.checkBotStatus.query({
              userId: message.author.id,
              timestamp,
              signature: createSignature(timestamp),
            });

            if (!statusCheck.hasJoinedBot) {
              await message.reply({
                embeds: [
                  createEmbed.error(
                    'Ошибка',
                    'Вы должны сначала присоединиться к боту с помощью команды !join'
                  ),
                ],
              });
              return;
            }

            // Добавляем игрока в очередь
            const result = await trpc.queues.addPlayer.mutate({
              userId: message.author.id,
              channelName: channelName,
              timestamp,
              signature: createSignature(
                timestamp,
                JSON.stringify({ userId: message.author.id, channelName })
              ),
            });

            // Формируем сообщение о текущем составе очереди
            const queueInfo = formatQueueInfo(result.queue);
            await message.reply({
              embeds: [createEmbed.info('Очередь обновлена', queueInfo)],
            });

            // Если очередь заполнена, начинаем формирование команд
            if (result.isComplete) {
              await message.reply({
                embeds: [
                  createEmbed.success('Очередь заполнена', 'Начинаем формирование команд...'),
                ],
              });
            }
          } catch (error: unknown) {
            if (typeof error === 'object' && error !== null && 'message' in error) {
              const errorMessage = (error as { message: string }).message;
              if (errorMessage === 'Вы уже находитесь в очереди') {
                await message.reply({
                  embeds: [createEmbed.error('Ошибка', 'Вы уже находитесь в очереди')],
                });
                return;
              }
            }
            console.error('Ошибка при добавлении игрока в очередь:', error);
            await message.reply({
              embeds: [
                createEmbed.error(
                  'Ошибка',
                  typeof error === 'object' && error !== null && 'message' in error
                    ? (error as { message: string }).message
                    : MESSAGES.ERROR.GENERAL
                ),
              ],
            });
          }
        } else if (content === GATHERING_COMMANDS.JOIN_BOT) {
          // Добавляем бота в очередь
          const result = await trpc.queues.addBot.mutate({
            channelName: channelName,
            timestamp,
            signature: createSignature(timestamp, JSON.stringify({ channelName })),
          });

          // Формируем сообщение о текущем составе очереди
          const queueInfo = formatQueueInfo(result.queue);
          await message.reply({
            embeds: [createEmbed.info('Очередь обновлена', queueInfo)],
          });

          // Если очередь заполнена, начинаем формирование команд
          if (result.isComplete) {
            // TODO: Добавить логику формирования команд
            await message.reply({
              embeds: [createEmbed.success('Очередь заполнена', 'Начинаем формирование команд...')],
            });
          }
        } else if (content === GATHERING_COMMANDS.LEAVE) {
          // Удаляем игрока из очереди
          try {
            const result = await trpc.queues.removePlayer.mutate({
              userId: message.author.id,
              channelName: channelName,
              timestamp,
              signature: createSignature(
                timestamp,
                JSON.stringify({ userId: message.author.id, channelName })
              ),
            });

            if (result.isDeleted) {
              await message.reply({
                embeds: [
                  createEmbed.info(
                    'Очередь удалена',
                    'Очередь была удалена, так как все игроки покинули её.'
                  ),
                ],
              });
            } else {
              // Формируем сообщение о текущем составе очереди
              const queueInfo = formatQueueInfo(result.queue);
              await message.reply({
                embeds: [createEmbed.info('Очередь обновлена', queueInfo)],
              });
            }
          } catch (error: unknown) {
            if (typeof error === 'object' && error !== null && 'message' in error) {
              const errorMessage = (error as { message: string }).message;
              if (errorMessage === 'Очередь не найдена') {
                await message.reply({
                  embeds: [createEmbed.error('Ошибка', 'В данный момент нет активной очереди')],
                });
                return;
              }
              if (errorMessage === 'Вы не находитесь в очереди') {
                await message.reply({
                  embeds: [createEmbed.error('Ошибка', 'Вы не находитесь в очереди')],
                });
                return;
              }
            }
            throw error;
          }
        } else if (content === GATHERING_COMMANDS.LEAVE_BOT) {
          // Удаляем бота из очереди
          try {
            const result = await trpc.queues.removeBot.mutate({
              channelName: channelName,
              timestamp,
              signature: createSignature(timestamp, JSON.stringify({ channelName })),
            });

            if (result.isDeleted) {
              await message.reply({
                embeds: [
                  createEmbed.info(
                    'Очередь удалена',
                    'Очередь была удалена, так как все участники покинули её.'
                  ),
                ],
              });
            } else {
              // Формируем сообщение о текущем составе очереди
              const queueInfo = formatQueueInfo(result.queue);
              await message.reply({
                embeds: [createEmbed.info('Очередь обновлена', queueInfo)],
              });
            }
          } catch (error: unknown) {
            if (typeof error === 'object' && error !== null && 'message' in error) {
              const errorMessage = (error as { message: string }).message;
              if (errorMessage === 'Очередь не найдена') {
                await message.reply({
                  embeds: [createEmbed.error('Ошибка', 'В данный момент нет активной очереди')],
                });
                return;
              }
              if (errorMessage === 'В очереди нет ботов') {
                await message.reply({
                  embeds: [createEmbed.error('Ошибка', 'В очереди нет ботов')],
                });
                return;
              }
            }
            throw error;
          }
        }

        // Очищаем старые очереди
        await trpc.queues.cleanOld.mutate({
          timestamp,
          signature: createSignature(timestamp),
        });
      } catch (error) {
        console.error('Ошибка при обработке команды очереди:', error);
        await message.reply({
          embeds: [
            createEmbed.error(
              'Ошибка',
              typeof error === 'object' && error !== null && 'message' in error
                ? (error as { message: string }).message
                : MESSAGES.ERROR.GENERAL
            ),
          ],
        });
      }
      return;
    }
    return;
  }

  // Если пытаются использовать команды сбора в обычном канале
  if (
    content === GATHERING_COMMANDS.JOIN ||
    content === GATHERING_COMMANDS.JOIN_BOT ||
    content === GATHERING_COMMANDS.LEAVE ||
    content === GATHERING_COMMANDS.LEAVE_BOT
  ) {
    await message.reply({
      embeds: [createEmbed.error('Неверный канал', MESSAGES.ERROR.WRONG_CHANNEL_GATHERING)],
    });
    return;
  }

  // Обработка стандартных команд только в не-сборочных каналах
  await commandHandler.handleMessage(message);
});

// Обработка ошибок
client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

// Обработчик готовности бота
client.once(Events.ClientReady, (c) => {
  console.log(`Бот готов! Вошел как ${c.user.tag}`);

  // Запускаем планировщик проверки очередей
  setInterval(async () => {
    console.log('Проверка старых очередей');
    try {
      const timestamp = Date.now().toString();
      const oldQueues = await trpc.queues.cleanOld.mutate({
        timestamp,
        signature: createSignature(timestamp),
      });

      // Если есть устаревшие очереди, отправляем уведомления
      if (oldQueues.length > 0) {
        for (const queue of oldQueues) {
          // Находим канал, в котором была очередь
          const channelName =
            queue.gameType === 'THREE_VS_THREE'
              ? 'сбор_на_игру_3x3'
              : queue.gameType === 'TWO_VS_TWO_VS_TWO'
                ? 'сбор_на_игру_2x2x2'
                : 'сбор_на_игру_2x2';

          // Ищем канал во всех гильдиях
          for (const guild of client.guilds.cache.values()) {
            const channel = guild.channels.cache.find(
              (ch) => ch.name === channelName && ch.type === 0
            );

            if (channel) {
              await (channel as TextChannel).send({
                embeds: [
                  createEmbed.info(
                    'Очередь удалена',
                    'Очередь была автоматически удалена из-за отсутствия активности в течение часа.'
                  ),
                ],
              });
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при проверке старых очередей:', error);
    }
  }, 10000); // Проверяем каждую минуту
});

// Подключаемся к Discord
client.login(DISCORD_BOT_TOKEN);
