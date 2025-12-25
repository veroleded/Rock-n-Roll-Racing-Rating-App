// Префикс для каналов сбора на игру
export const GAME_GATHERING_PREFIX = 'сбор-на-игру';

// Команды для каналов сбора
export const GATHERING_COMMANDS = {
  JOIN: '++',
  JOIN_BOT: '+bot',
  LEAVE: '--',
  LEAVE_BOT: '-bot',
  CLEAN: 'clean',
  HELP: 'help',
} as const;

// Описания команд для каналов сбора
export const GATHERING_COMMANDS_DESCRIPTIONS = new Map([
  [GATHERING_COMMANDS.JOIN, 'Присоединиться к очереди'],
  [GATHERING_COMMANDS.JOIN_BOT, 'Добавить бота в очередь'],
  [GATHERING_COMMANDS.LEAVE, 'Покинуть очередь'],
  [GATHERING_COMMANDS.LEAVE_BOT, 'Удалить бота из очереди'],
  [GATHERING_COMMANDS.CLEAN, 'Очистить текущую очередь'],
  [GATHERING_COMMANDS.HELP, 'Показать список доступных команд'],
]);
