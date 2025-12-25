import { prisma } from '@/lib/prisma';
import { QueueCleanerService } from './queue-cleaner.service';

// Инициализируем сервис очистки очередей
let queueCleanerService: QueueCleanerService | null = null;

export function initializeQueueCleaner(): void {
  if (queueCleanerService) {
    console.log('[QueueCleaner] Уже инициализирован');
    return;
  }

  console.log('[QueueCleaner] Инициализация сервиса очистки очередей');
  queueCleanerService = new QueueCleanerService(prisma);
  // Проверяем каждую минуту (60000ms)
  queueCleanerService.start(60000);
}

// Автоматически инициализируем при импорте модуля (только на сервере)
if (typeof window === 'undefined') {
  initializeQueueCleaner();
}

