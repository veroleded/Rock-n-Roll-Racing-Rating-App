// Инициализация периодического сохранения метрик
import { saveMetricsToFile } from './metrics-logger';

const SAVE_INTERVAL_MS = 5 * 60 * 1000; // 5 минут

let saveInterval: NodeJS.Timeout | null = null;
let isInitialized = false;

export function startMetricsLogger(): void {
  if (isInitialized) {
    console.log('[MetricsLogger] Уже инициализирован');
    return;
  }
  
  console.log('[MetricsLogger] Запуск периодического сохранения метрик (интервал: 5 минут)');
  
  // Сохраняем сразу при старте
  saveMetricsToFile().catch(error => {
    console.error('[MetricsLogger] Ошибка при первом сохранении:', error);
  });
  
  // Затем сохраняем каждые 5 минут
  saveInterval = setInterval(() => {
    saveMetricsToFile().catch(error => {
      console.error('[MetricsLogger] Ошибка при сохранении метрик:', error);
    });
  }, SAVE_INTERVAL_MS);
  
  isInitialized = true;
  
  // Сохраняем метрики при завершении процесса
  process.on('SIGTERM', () => {
    stopMetricsLogger();
  });
  
  process.on('SIGINT', () => {
    stopMetricsLogger();
  });
}

export function stopMetricsLogger(): void {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
  
  // Сохраняем метрики перед завершением
  saveMetricsToFile().catch(error => {
    console.error('[MetricsLogger] Ошибка при финальном сохранении:', error);
  });
  
  isInitialized = false;
  console.log('[MetricsLogger] Остановлен');
}

// Автоматическая инициализация при импорте (только в Node.js runtime)
if (typeof window === 'undefined') {
  startMetricsLogger();
}

