import { Stats, User } from '@prisma/client';
import { EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
import { COLORS } from '../constants/colors';
import { EMOJIS } from '../constants/emojis';

dotenv.config();

const APP_URL =
  process.env.NODE_ENV === 'production' ? (process.env.APP_URL ?? '') : 'http://80.76.34.54:3000';

// Утилиты для создания embed сообщений
export const createEmbed = {
  success: (title: string, description?: string) => {
    return new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle(`${EMOJIS.SUCCESS} ${title}`)
      .setDescription(description || '')
      .setTimestamp();
  },

  error: (title: string, description?: string) => {
    return new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle(`${EMOJIS.ERROR} ${title}`)
      .setDescription(description || '')
      .setTimestamp();
  },

  info: (title: string, description?: string) => {
    return new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`${EMOJIS.INFO} ${title}`)
      .setDescription(description || '')
      .setTimestamp();
  },

  warning: (title: string, description?: string) => {
    return new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle(`${EMOJIS.WARNING} ${title}`)
      .setDescription(description || '')
      .setTimestamp();
  },

  stats: (user: User & { stats: Stats | null }) => {
    return new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`${EMOJIS.TROPHY} Статистика игрока ${user.name}`)
      .setDescription(`[Перейти к статистике](${APP_URL}/users/${user.id})`)
      .setThumbnail(user.image || null)
      .setTimestamp();
  },

  top: () => {
    return new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`${EMOJIS.TROPHY} ТОП-10 ИГРОКОВ`)
      .setDescription(`[Перейти к списку игроков](${APP_URL}/users)`)
      .setTimestamp();
  },

  help: () => {
    return new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`${EMOJIS.INFO} Список команд`)
      .setTimestamp();
  },
} as const;
