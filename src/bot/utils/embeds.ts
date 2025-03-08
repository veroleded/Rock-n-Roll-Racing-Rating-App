import { Stats, User } from '@prisma/client';
import { EmbedBuilder } from 'discord.js';
import { COLORS } from '../constants/colors';
import { EMOJIS } from '../constants/emojis';

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
      .setThumbnail(user.image || null)
      .setTimestamp();
  },

  top: () => {
    return new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`${EMOJIS.TROPHY} ТОП-10 ИГРОКОВ`)
      .setTimestamp();
  },

  help: () => {
    return new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`${EMOJIS.INFO} Список команд`)
      .setTimestamp();
  },
} as const;
