import { Message } from 'discord.js';

export interface Command {
  name: string;
  description: string;
  execute: (message: Message) => Promise<void>;
}
