import { prisma } from '@/lib/prisma';
import { UsersService } from '@/server/services/users/users.service';
import { Message } from 'discord.js';
import dotenv from 'dotenv';
import { Command } from '../types/command';
import { createEmbed } from '../utils/embeds';
dotenv.config();

const usersService = new UsersService(prisma);

const APP_URL =
  process.env.NODE_ENV === 'production' ? (process.env.APP_URL ?? '') : 'http://80.76.34.54';

export const joinCommand: Command = {
  name: 'join',
  description: 'Присоединиться к боту',
  execute: async (message: Message) => {
    const statusCheck = await usersService.getUserById(message.author.id);

    if (statusCheck?.hasJoinedBot) {
      await message.reply({
        embeds: [
          createEmbed.info('Вы уже присоединились!', `🌐 Войдите в веб-приложение: ${APP_URL}`),
        ],
      });
      return;
    }

    const avatar = message.author.avatar
      ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png`
      : 'https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png';

    const username = message.author.globalName || message.author.username;

    const joinData = {
      id: message.author.id,
      name: username,
      image: avatar,
    };

    await usersService.create(joinData);

    await message.reply({
      embeds: [
        createEmbed.success('Успешное присоединение!', `🌐 Войдите в веб-приложение: ${APP_URL}`),
      ],
    });
  },
};
