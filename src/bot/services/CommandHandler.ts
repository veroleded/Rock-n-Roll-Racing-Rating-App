import { prisma } from '@/lib/prisma';
import { UsersService } from '@/server/services/users/users.service';
import { Message } from 'discord.js';
import { MESSAGES } from '../constants/messages';
import { Command } from '../types/command';
import { createEmbed } from '../utils/embeds';
export class CommandHandler {
  private commands: Map<string, Command> = new Map();
  private userService: UsersService;
  constructor() {
    this.userService = new UsersService(prisma);
  }

  private async checkAndUpdateUserData(message: Message): Promise<void> {
    try {
      const currentAvatar = message.author.avatar
        ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png`
        : 'https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png';

      const currentUsername = message.author.globalName || message.author.username;

      const userData = await this.userService.getUserById(message.author.id);

      if (userData && (userData.image !== currentAvatar || userData.name !== currentUsername)) {
        const updateData = {
          id: message.author.id,
          name: currentUsername,
          image: currentAvatar,
        };

        await this.userService.updateUser(updateData);

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
    if (message.author.bot) return;

    if (!message.content.startsWith('!')) return;

    await this.checkAndUpdateUserData(message);

    const args = message.content.slice(1).trim().split(/ +/);
    const rawCommandName = args.shift();

    if (!rawCommandName) return;

    const commandName = rawCommandName.toLowerCase();

    const command = this.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message);
    } catch (error) {
      console.error(`Ошибка выполнения команды ${commandName}:`, {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      await message.reply({
        embeds: [createEmbed.error('Ошибка', MESSAGES.ERROR.COMMAND_FAILED(commandName))],
      });
    }
  }

  getCommands(): Command[] {
    return Array.from(this.commands.values());
  }
}
