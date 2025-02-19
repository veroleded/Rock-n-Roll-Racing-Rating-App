import type { AppRouter } from "@/server/root";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { createHmac } from "crypto";
import { Client, Events, GatewayIntentBits } from "discord.js";
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

// Обработчик готовности бота
client.once(Events.ClientReady, (c) => {
  console.log(`Бот готов! Вошел как ${c.user.tag}`);
});

// Обработчик сообщений
client.on(Events.MessageCreate, async (message) => {
  // Игнорируем сообщения от ботов
  if (message.author.bot) return;

  // Обрабатываем команду !join
  if (message.content.toLowerCase() === "!join") {
    try {
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
      const user = await trpc.auth.joinBot.mutate({
        ...joinData,
        timestamp: joinTimestamp,
        signature: joinSignature,
      });

      console.log("Join successful. User data:", user);

      // Формируем сообщение в зависимости от роли пользователя
      let replyMessage = "✅ Вы успешно присоединились! ";
      if (user.role === "ADMIN") {
        replyMessage += "**Вам предоставлены права администратора.** ";
      }
      replyMessage += `\n🌐 Войдите в веб-приложение: ${process.env.NEXTAUTH_URL}`;

      await message.reply(replyMessage);
    } catch (error) {
      console.error("Detailed error in !join command:", {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      await message.reply(
        "❌ Произошла ошибка при выполнении команды. Пожалуйста, попробуйте позже."
      );
    }
  }
});

// Обработка ошибок
client.on(Events.Error, (error) => {
  console.error("Discord client error:", error);
});

// Подключаемся к Discord
client.login(process.env.DISCORD_BOT_TOKEN);
