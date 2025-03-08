import { Message } from 'discord.js';
import { MESSAGES } from '../constants/messages';
import { trpc } from '../trpc';
import { Command } from '../types/command';
import { createEmbed } from '../utils/embeds';
import { createSignature } from '../utils/signature';

export class CommandHandler {
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
      await message.reply({
        embeds: [createEmbed.error('Ошибка', MESSAGES.ERROR.COMMAND_FAILED(commandName))],
      });
    }
  }

  // Получение списка всех команд
  getCommands(): Command[] {
    return Array.from(this.commands.values());
  }
}
