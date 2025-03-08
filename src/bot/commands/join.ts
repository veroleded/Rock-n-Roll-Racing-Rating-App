import { Message } from 'discord.js';
import { trpc } from '../trpc';
import { Command } from '../types/command';
import { createEmbed } from '../utils/embeds';
import { createSignature } from '../utils/signature';

const APP_URL =
  process.env.NODE_ENV === 'production' ? (process.env.APP_URL ?? '') : 'http://localhost:3000';

export const joinCommand: Command = {
  name: 'join',
  description: 'Присоединиться к боту',
  execute: async (message: Message) => {
    const timestamp = Date.now().toString();

    // Сначала проверяем, не присоединился ли уже пользователь
    const statusCheck = await trpc.auth.checkBotStatus.query({
      userId: message.author.id,
      timestamp,
      signature: createSignature(timestamp),
    });

    if (statusCheck.hasJoinedBot) {
      await message.reply({
        embeds: [
          createEmbed.info('Вы уже присоединились!', `🌐 Войдите в веб-приложение: ${APP_URL}`),
        ],
      });
      return;
    }

    // Получаем аватар пользователя
    const avatar = message.author.avatar
      ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png`
      : 'https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png';

    // Получаем имя пользователя
    const username = message.author.globalName || message.author.username;

    // Подготавливаем данные для запроса
    const joinData = {
      userId: message.author.id,
      username,
      avatar,
    };

    // Создаем новую временную метку для запроса присоединения
    const joinTimestamp = Date.now().toString();
    const joinSignature = createSignature(joinTimestamp, JSON.stringify(joinData));

    // Отправляем запрос на присоединение
    await trpc.auth.joinBot.mutate({
      ...joinData,
      timestamp: joinTimestamp,
      signature: joinSignature,
    });

    await message.reply({
      embeds: [
        createEmbed.success('Успешное присоединение!', `🌐 Войдите в веб-приложение: ${APP_URL}`),
      ],
    });
  },
};
