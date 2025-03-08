import { Message } from 'discord.js';

// Интерфейс для команд
export interface Command {
  name: string;
  description: string;
  execute: (message: Message) => Promise<void>;
}
