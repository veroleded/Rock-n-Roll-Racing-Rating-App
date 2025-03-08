import { Client, Events, GatewayIntentBits, Message, TextChannel } from 'discord.js';
import * as dotenv from 'dotenv';
import { bottomCommand } from './commands/bottom';
import { HelpCommand } from './commands/help';
import { joinCommand } from './commands/join';
import { rankCommand } from './commands/rank';
import { statCommand } from './commands/stat';
import { topCommand } from './commands/top';
import { GAME_GATHERING_PREFIX, GATHERING_COMMANDS } from './constants/commands';
import { MESSAGES } from './constants/messages';
import { CommandHandler } from './services/CommandHandler';
import { GatheringCommandsHandler } from './services/GatheringCommandsHandler';
import { trpc } from './trpc';
import { createEmbed } from './utils/embeds';
import { createSignature } from './utils/signature';

// Загружаем переменные окружения
dotenv.config();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// Создаем клиент Discord с необходимыми разрешениями
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Создаем обработчики команд
const commandHandler = new CommandHandler();
const gatheringCommandsHandler = new GatheringCommandsHandler();

// Регистрируем стандартные команды
const commands = [joinCommand, statCommand, topCommand, bottomCommand, rankCommand];
commands.forEach((command) => commandHandler.register(command));
// Регистрируем команду help после всех остальных команд
commandHandler.register(new HelpCommand(commands));

// Вспомогательная функция для проверки команд сбора
function isGatheringCommand(
  content: string
): content is (typeof GATHERING_COMMANDS)[keyof typeof GATHERING_COMMANDS] {
  return Object.values(GATHERING_COMMANDS).includes(
    content as (typeof GATHERING_COMMANDS)[keyof typeof GATHERING_COMMANDS]
  );
}

// Обработчик сообщений
client.on(Events.MessageCreate, async (message: Message) => {
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

    // Проверяем, является ли сообщение командой сбора
    if (isGatheringCommand(content)) {
      await gatheringCommandsHandler.handleCommand(message, channelName);
    }
    return;
  }

  // Если пытаются использовать команды сбора в обычном канале
  if (isGatheringCommand(content)) {
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
  }, 10000); // Проверяем каждые 10 секунд
});

// Подключаемся к Discord
client.login(DISCORD_BOT_TOKEN);
