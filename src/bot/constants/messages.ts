import { EMOJIS } from './emojis';

export const MESSAGES = {
  ERROR: {
    COMMAND_FAILED: (command: string) =>
      `${EMOJIS.ERROR} Произошла ошибка при выполнении команды \`${command}\`\n` +
      `Пожалуйста, попробуйте позже или обратитесь к администратору.`,
    USER_NOT_FOUND: `${EMOJIS.ERROR} Пользователь не найден в базе данных.`,
    GENERAL: `${EMOJIS.ERROR} Произошла непредвиденная ошибка. Пожалуйста, попробуйте позже.`,
    WRONG_CHANNEL_GATHERING: `${EMOJIS.ERROR} Эта команда работает только в каналах сбора на игру.`,
    WRONG_CHANNEL_STANDARD: `${EMOJIS.ERROR} Эта команда не работает в каналах сбора на игру.`,
  },
  SUCCESS: {
    ALREADY_JOINED: (appUrl: string) =>
      `${EMOJIS.INFO} Вы уже присоединились к боту!\n` +
      `${EMOJIS.LINK} Войдите в веб-приложение: ${appUrl}`,
    JOIN_BOT: (appUrl: string) =>
      `${EMOJIS.SUCCESS} Вы успешно присоединились!\n` +
      `${EMOJIS.LINK} Войдите в веб-приложение: ${appUrl}`,
    USER_UPDATED: (username: string) =>
      `${EMOJIS.SUCCESS} Данные пользователя ${username} успешно обновлены.`,
  },
  HELP: {
    HEADER: `${EMOJIS.INFO} **Доступные команды:**\n\n`,
    COMMAND: (name: string, description: string) => `${EMOJIS.GAME} \`!${name}\` - ${description}`,
  },
  STATS: {
    NO_STATS: (username: string) => `${EMOJIS.INFO} У пользователя ${username} еще нет статистики.`,
    HEADER: (username: string) => `${EMOJIS.TROPHY} **Статистика игрока ${username}**\n\n`,
  },
} as const;
