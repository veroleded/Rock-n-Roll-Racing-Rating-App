import type { AppRouter } from "@/server/root";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { createHmac } from "crypto";
import { Client, Events, GatewayIntentBits, Message } from "discord.js";
import * as dotenv from "dotenv";
import superjson from "superjson";

// Загружаем переменные окружения
dotenv.config();

// Создаем клиент tRPC
const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${process.env.NEXTAUTH_URL}/api/trpc`,
    }),
  ],
  transformer: superjson,
});

// Функция для создания подписи
function createSignature(timestamp: string, body: string = ""): string {
  const hmac = createHmac("sha256", process.env.BOT_SECRET_KEY || "");
  return hmac.update(`${timestamp}.${body}`).digest("hex");
}

// Создаем клиент Discord с необходимыми разрешениями
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Интерфейс для команд
interface Command {
  name: string;
  description: string;
  execute: (message: Message) => Promise<void>;
}

// Класс для управления командами
class CommandHandler {
  private commands: Map<string, Command> = new Map();

  // Регистрация команды
  register(command: Command) {
    this.commands.set(command.name.toLowerCase(), command);
  }

  // Обработка сообщения и выполнение команды
  async handleMessage(message: Message) {
    // Игнорируем сообщения от ботов
    if (message.author.bot) return;

    // Проверяем, является ли сообщение командой
    if (!message.content.startsWith("!")) return;

    // Разбиваем сообщение на команду и аргументы
    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    // Ищем команду
    const command = this.commands.get(commandName);
    if (!command) return;

    // Выполняем команду
    try {
      await command.execute(message);
    } catch (error) {
      console.error(`Ошибка выполнения команды ${commandName}:`, {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      await message.reply(
        "❌ Произошла ошибка при выполнении команды. Пожалуйста, попробуйте позже."
      );
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
  name: "join",
  description: "Присоединиться к боту",
  execute: async (message) => {
    const timestamp = Date.now().toString();

    // Сначала проверяем, не присоединился ли уже пользователь
    const statusCheck = await trpc.auth.checkBotStatus.query({
      userId: message.author.id,
      timestamp,
      signature: createSignature(timestamp),
    });

    if (statusCheck.hasJoinedBot) {
      await message.reply(
        "ℹ️ Вы уже присоединились к боту! Можете войти в веб-приложение:\n" +
          `🌐 ${process.env.NEXTAUTH_URL}`
      );
      return;
    }

    // Получаем аватар пользователя
    const avatar = message.author.avatar
      ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png`
      : "https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png";

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
    const joinSignature = createSignature(
      joinTimestamp,
      JSON.stringify(joinData)
    );

    // Отправляем запрос на присоединение
    await trpc.auth.joinBot.mutate({
      ...joinData,
      timestamp: joinTimestamp,
      signature: joinSignature,
    });


    // Формируем сообщение в зависимости от роли пользователя
    let replyMessage = "✅ Вы успешно присоединились! ";
    replyMessage += `\n🌐 Войдите в веб-приложение: ${process.env.NEXTAUTH_URL}`;

    await message.reply(replyMessage);
  },
});

// Регистрируем команду !help
commandHandler.register({
  name: "help",
  description: "Показать список доступных команд",
  execute: async (message) => {
    const commands = commandHandler.getCommands();
    let helpMessage = "📋 **Доступные команды:**\n\n";
    
    commands.forEach(cmd => {
      helpMessage += `**!${cmd.name}** - ${cmd.description}\n`;
    });
    
    await message.reply(helpMessage);
  },
});

// Регистрируем команду !stat
commandHandler.register({
  name: "stat",
  description: "Показывает всю информацию про игрока (место в рейте, очки рейта, игры, дивизионы, очки)",
  execute: async (message) => {
    try {
      // Получаем ID пользователя
      const content = message.content.trim();
      let discordId = message.author.id;
      
      // Если указан другой пользователь
      if (content.length > 5) { // !stat + пробел + ID
        const mentionedId = content.slice(6).trim();
        if (mentionedId) {
          discordId = mentionedId;
        }
      }

      try {
        // Получаем информацию о пользователе
        const user = await trpc.users.byId.query(discordId);
        console.log(user);
        
        if (!user.stats) {
          await message.reply(`ℹ️ У пользователя ${user.name} еще нет статистики.`);
          return;
        }

        // Получаем всех пользователей для определения места в рейтинге
        const allUsers = await trpc.users.list.query();
        
        // Сортируем пользователей по рейтингу
        const sortedUsers = allUsers
          .filter(u => u.stats)
          .sort((a, b) => (b.stats?.rating || 0) - (a.stats?.rating || 0));
        
        // Находим место игрока в рейтинге
        const userRank = sortedUsers.findIndex(u => u.id === user.id) + 1;
        const rankSuffix = userRank === 1 ? "st" : userRank === 2 ? "nd" : userRank === 3 ? "rd" : "th";
        
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

        const statMessage = 
          `**[Rank]** Place ${userRank}${rankSuffix}, Rating ${newRating} (${prevRating}→${newRating})\n` +
          `**[Games]** Total ${totalGames}, Won ${user.stats.wins}, Lost ${user.stats.losses}, Draw ${user.stats.draws}, WR ${winRate}%\n` +
          `**[Divisions]** Total ${divTotal}, Won ${divWon}, Lost ${divLost}, Draw ${divDraw}\n` +
          `**[Scores]** Total ${totalScores}`;

        await message.reply(statMessage);
      } catch {
        await message.reply(`❌ Пользователь не найден в базе данных.`);
      }
    } catch (error) {
      console.error("Ошибка в команде !stat:", {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      await message.reply(
        "❌ Произошла ошибка при выполнении команды. Пожалуйста, попробуйте позже."
      );
    }
  },
});

// Регистрируем команду !top
commandHandler.register({
  name: "top",
  description: "Показывает первые 10 человек в рейтинге",
  execute: async (message) => {
    try {
      // Получаем топ-10 игроков
      const topPlayers = await trpc.users.getTop.query('start');

      if (!topPlayers || topPlayers.length === 0) {
        await message.reply("ℹ️ На данный момент нет игроков в рейтинге.");
        return;
      }

      // Добавляем эмодзи для рангов
      const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      
      // Формируем красивое сообщение с топ-10 игроками
      let topMessage = "🏆 **ТОП-10 ИГРОКОВ** 🏆\n\n";
      
      topPlayers.forEach((player, index) => {
        const emoji = rankEmojis[index];
        const rating = player.stats?.rating || 0;
        const minRating = player.stats?.minRating || 0;
        const maxRating = player.stats?.maxRating || 0;
        const ratingChange = `(${minRating}→${maxRating})`;
        const wins = player.stats?.wins || 0;
        const losses = player.stats?.losses || 0;
        const draws = player.stats?.draws || 0;
        const gamesPlayed = wins + losses + draws;
        const divs = player.stats?.totalDivisions || 0;
        const score = player.stats?.totalScore || 0;
        const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
        
        // Формат в стиле маркированного списка в блоке кода
        topMessage += `${emoji} **${player.name}**\n\`\`\``;
        topMessage += `• Rating: ${rating} ${ratingChange}\n`;
        topMessage += `• Games: ${gamesPlayed}, Divs: ${divs}, Winrate: ${winRate}%\n`;
        topMessage += `• Wins: ${wins}, Losses: ${losses}, Draws: ${draws}\n`;
        topMessage += `• Score: ${score}\n`;
        topMessage += `\`\`\`\n`;
      });

      await message.reply(topMessage);
    } catch (error) {
      console.error("Ошибка в команде !top:", {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      await message.reply(
        "❌ Произошла ошибка при выполнении команды. Пожалуйста, попробуйте позже."
      );
    }
  },
});

// Регистрируем команду !rank
commandHandler.register({
  name: "rank",
  description: "Показывает позицию игрока в рейтинге и 5 человек над ним и 5 человек под ним",
  execute: async (message) => {
    try {
      // Получаем ID пользователя
      const content = message.content.trim();
      let discordId = message.author.id;
      
      // Если указан другой пользователь
      if (content.length > 5) { // !rank + пробел + ID
        const mentionedId = content.slice(6).trim();
        if (mentionedId) {
          discordId = mentionedId;
        }
      }

      try {
        
        const neighbors = await trpc.users.getUserWithNeighbors.query(discordId);

        if (neighbors.length === 0) {
          await message.reply(`❌ Пользователь не найден в базе данных.`);
          return;
        }

        // Создаем красивый заголовок для сообщения
        let rankMessage = "🏆 **РЕЙТИНГ ИГРОКА И СОСЕДИ** 🏆\n\n";
        
        // Получаем стартовую позицию (предположим, что это первый индекс + 1)
        const startRank = 1; // Если соседи отсортированы в правильном порядке, это будет их ранг
        
        neighbors.forEach((player, index) => {
          const rating = player.stats?.rating || 0;
          const minRating = player.stats?.minRating || 0;
          const maxRating = player.stats?.maxRating || 0;
          const ratingChange = `(${minRating}→${maxRating})`;
          const wins = player.stats?.wins || 0;
          const losses = player.stats?.losses || 0;
          const draws = player.stats?.draws || 0;
          const gamesPlayed = wins + losses + draws;
          const divs = player.stats?.totalDivisions || 0;
          const score = player.stats?.totalScore || 0;
          const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
          const rank = startRank + index;
          
          // Определяем ранговую иконку
          let rankIcon = '';
          if (rank === 1) rankIcon = '🥇';
          else if (rank === 2) rankIcon = '🥈';
          else if (rank === 3) rankIcon = '🥉';
          else rankIcon = `${rank}`;
          
          // Если это целевой пользователь - добавляем указатель
          const namePrefix = player.id === discordId ? '➡️ ' : '';
          
          // Формат в стиле маркированного списка в блоке кода
          rankMessage += `${namePrefix}${rankIcon} **${player.name}**\n\`\`\``;
          rankMessage += `• Rating: ${rating} ${ratingChange}\n`;
          rankMessage += `• Games: ${gamesPlayed}, Divs: ${divs}, Winrate: ${winRate}%\n`;
          rankMessage += `• Wins: ${wins}, Losses: ${losses}, Draws: ${draws}\n`;
          rankMessage += `• Score: ${score}\n`;
          rankMessage += `\`\`\`\n`;
        });

        await message.reply(rankMessage);
      } catch (error) {
        console.error("Ошибка при получении списка игроков:", error);
        await message.reply(`❌ Произошла ошибка при получении списка игроков.`);
      }
    } catch (error) {
      console.error("Ошибка в команде !rank:", {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      await message.reply(
        "❌ Произошла ошибка при выполнении команды. Пожалуйста, попробуйте позже."
      );
    }
  },
});

// Обработчик сообщений
client.on(Events.MessageCreate, async (message) => {
  await commandHandler.handleMessage(message);
});

// Обработка ошибок
client.on(Events.Error, (error) => {
  console.error("Discord client error:", error);
});

// Обработчик готовности бота
client.once(Events.ClientReady, (c) => {
  console.log(`Бот готов! Вошел как ${c.user.tag}`);
});

// Подключаемся к Discord
client.login(process.env.DISCORD_BOT_TOKEN);
