import { Message } from 'discord.js';
import { Command } from '../types/command';
import { createEmbed } from '../utils/embeds';

export class HelpCommand implements Command {
  private commands: Command[];

  constructor(commands: Command[]) {
    this.commands = commands;
  }

  name = 'help';
  description = 'Показать список доступных команд';

  async execute(message: Message): Promise<void> {
    const embed = createEmbed.help();

    const commandsList = this.commands
      .map((cmd) => `🎮 !${cmd.name} - ${cmd.description}`)
      .join('\n');

    embed.setDescription(commandsList);

    await message.reply({ embeds: [embed] });
  }
}
