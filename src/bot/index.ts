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
import { QueueNotificationService } from './services/QueueNotificationService';
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

  const matchNotificationService = new MatchNotificationService(client);
  matchNotificationService.initialize();

  const queueNotificationService = new QueueNotificationService(client);
  queueNotificationService.initialize();
});

client.login(DISCORD_BOT_TOKEN);
