import { prisma } from '@/lib/prisma';
import { QueuesService } from '@/server/services/queues/queues.service';
import { UsersService } from '@/server/services/users/users.service';
import { Message } from 'discord.js';
import { GATHERING_COMMANDS, GATHERING_COMMANDS_DESCRIPTIONS } from '../constants/commands';
import { MESSAGES } from '../constants/messages';
import { createEmbed } from '../utils/embeds';
import { formatQueueInfo } from '../utils/queue';
import { TeamFormationService } from './TeamFormationService';

export class GatheringCommandsHandler {
  private teamFormationService: TeamFormationService;
  private queueService: QueuesService;
  private usersService: UsersService;
  constructor() {
    this.teamFormationService = new TeamFormationService();
    this.queueService = new QueuesService(prisma);
    this.usersService = new UsersService(prisma);
  }

  async handleCommand(message: Message, channelName: string) {
    const content = message.content.trim();

    try {
      switch (content) {
        case GATHERING_COMMANDS.HELP:
          await this.handleHelpCommand(message);
          break;

        case GATHERING_COMMANDS.CLEAN:
          await this.handleCleanCommand(message, channelName);
          break;

        case GATHERING_COMMANDS.JOIN:
          await this.handleJoinCommand(message, channelName);
          break;

        case GATHERING_COMMANDS.JOIN_BOT:
          await this.handleJoinBotCommand(message, channelName);
          break;

        case GATHERING_COMMANDS.LEAVE:
          await this.handleLeaveCommand(message, channelName);
          break;

        case GATHERING_COMMANDS.LEAVE_BOT:
          await this.handleLeaveBotCommand(message, channelName);
          break;
      }

      await this.cleanOldQueues();
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
  }

  private async handleHelpCommand(message: Message) {
    const embed = createEmbed.help();
    embed.setDescription(
      Array.from(GATHERING_COMMANDS_DESCRIPTIONS.entries())
        .map(([command, description]) => `🎮 \`${command}\` - ${description}`)
        .join('\n')
    );
    await message.reply({ embeds: [embed] });
  }

  private async handleCleanCommand(message: Message, channelName: string) {
    try {
      await this.queueService.cleanQueueByChannel(channelName);

      await message.reply({
        embeds: [createEmbed.success('Очередь очищена', 'Очередь была успешно очищена.')],
      });
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

  private async handleJoinCommand(message: Message, channelName: string) {
    try {
      const statusCheck = await this.usersService.getUserById(message.author.id);

      if (!statusCheck?.hasJoinedBot) {
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

      const result = await this.queueService.addPlayerToQueue(message.author.id, channelName);

      const queueInfo = formatQueueInfo(result.queue);
      await message.reply({
        embeds: [createEmbed.info('Очередь обновлена', queueInfo)],
      });

      if (result.isComplete) {
        await message.reply({
          embeds: [createEmbed.success('Очередь заполнена', 'Начинаем формирование команд...')],
        });
        await this.teamFormationService.formTeams(result.queue, message);
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
      throw error;
    }
  }

  private async handleJoinBotCommand(message: Message, channelName: string) {
    const result = await this.queueService.addBotToQueue(channelName);

    const queueInfo = formatQueueInfo(result.queue);
    await message.reply({
      embeds: [createEmbed.info('Очередь обновлена', queueInfo)],
    });

    if (result.isComplete) {
      await message.reply({
        embeds: [createEmbed.success('Очередь заполнена', 'Начинаем формирование команд...')],
      });
      await this.teamFormationService.formTeams(result.queue, message);
    }
  }

  private async handleLeaveCommand(message: Message, channelName: string) {
    try {
      const result = await this.queueService.removePlayerFromQueue(message.author.id, channelName);

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
  }

  private async handleLeaveBotCommand(message: Message, channelName: string) {
    try {
      const result = await this.queueService.removeBotFromQueue(channelName);

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

  private async cleanOldQueues() {
    await this.queueService.cleanOldQueues();
  }
}
