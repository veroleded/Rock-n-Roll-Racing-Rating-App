import { prisma } from '@/lib/prisma';
import { QueuesService } from '@/server/services/queues/queues.service';
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
import { MatchNotificationService } from './services/MatchNotificationService';
import { createEmbed } from './utils/embeds';

dotenv.config();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const commandHandler = new CommandHandler();
const gatheringCommandsHandler = new GatheringCommandsHandler();

const commands = [joinCommand, statCommand, topCommand, bottomCommand, rankCommand];
commands.forEach((command) => commandHandler.register(command));
commandHandler.register(new HelpCommand(commands));

function isGatheringCommand(
  content: string
): content is (typeof GATHERING_COMMANDS)[keyof typeof GATHERING_COMMANDS] {
  return Object.values(GATHERING_COMMANDS).includes(
    content as (typeof GATHERING_COMMANDS)[keyof typeof GATHERING_COMMANDS]
  );
}

client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.bot) return;

  if (!message.guild || !(message.channel instanceof TextChannel)) return;

  const channelName = message.channel.name;
  const isGatheringChannel = channelName.startsWith(GAME_GATHERING_PREFIX);
  const content = message.content.trim();

  if (isGatheringChannel) {
    if (content.startsWith('!')) {
      await message.reply({
        embeds: [createEmbed.error('Неверный канал', MESSAGES.ERROR.WRONG_CHANNEL_STANDARD)],
      });
      return;
    }

    if (isGatheringCommand(content)) {
      await gatheringCommandsHandler.handleCommand(message, channelName);
    }
    return;
  }

  if (isGatheringCommand(content)) {
    await message.reply({
      embeds: [createEmbed.error('Неверный канал', MESSAGES.ERROR.WRONG_CHANNEL_GATHERING)],
    });
    return;
  }

  await commandHandler.handleMessage(message);
});

client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

client.once(Events.ClientReady, (c) => {
  console.log(`Бот готов! Вошел как ${c.user.tag}`);

  const matchNotificationService = new MatchNotificationService(prisma, client);

  (async () => {
    await matchNotificationService.initialize();
    matchNotificationService.startChecker(10000);
  })();

  setInterval(async () => {
    console.log('Проверка старых очередей');
    try {
      const queuesService = new QueuesService(prisma);
      const oldQueues = await queuesService.cleanOldQueues();

      if (oldQueues.length > 0) {
        for (const queue of oldQueues) {
          // Определяем название канала на основе gameType
          const channelName =
            queue.gameType === 'THREE_VS_THREE'
              ? 'сбор-на-игру-3x3'
              : queue.gameType === 'THREE_VS_THREE_HIGH_MMR'
                ? 'сбор-на-игру-3x3-high-mmr'
                : queue.gameType === 'TWO_VS_TWO_VS_TWO'
                  ? 'сбор-на-игру-2x2x2'
                  : queue.gameType === 'TWO_VS_TWO_HIGH_MMR'
                    ? 'сбор-на-игру-2x2-high-mmr'
                    : 'сбор-на-игру-2x2';

          for (const guild of client.guilds.cache.values()) {
            // Ищем канал по названию из очереди
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
  }, 10000);
});

client.login(DISCORD_BOT_TOKEN);
