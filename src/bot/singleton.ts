// Защита от множественного запуска бота
let isRunning = false;
let instanceId: string;

export function ensureSingleInstance(): void {
  if (isRunning) {
    console.error('[Bot Singleton] Бот уже запущен! Обнаружен дубликат процесса.');
    console.error('[Bot Singleton] Останавливаю текущий процесс для предотвращения утечек...');
    process.exit(1);
  }

  instanceId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  isRunning = true;

  console.log(`[Bot Singleton] Защита от множественного запуска активирована. ID: ${instanceId}`);

  // Обработка завершения процесса
  process.on('exit', () => {
    isRunning = false;
    console.log('[Bot Singleton] Процесс завершается, защита снята');
  });

  process.on('SIGINT', () => {
    console.log('[Bot Singleton] Получен SIGINT, завершаю работу...');
    isRunning = false;
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('[Bot Singleton] Получен SIGTERM, завершаю работу...');
    isRunning = false;
    process.exit(0);
  });

  // Обработка необработанных ошибок
  process.on('uncaughtException', (error) => {
    console.error('[Bot Singleton] Необработанная ошибка:', error);
    isRunning = false;
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[Bot Singleton] Необработанное отклонение промиса:', reason);
    isRunning = false;
    process.exit(1);
  });
}

export function getInstanceId(): string {
  return instanceId;
}
