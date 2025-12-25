import { PrismaClient } from '@prisma/client';
import { QueuesService } from './queues.service';

export class QueueCleanerService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly queuesService: QueuesService;

  constructor(prisma: PrismaClient) {
    this.queuesService = new QueuesService(prisma);
  }

  start(intervalMs: number = 60000): void {
    // Проверяем каждую минуту (можно настроить)
    console.log(`[QueueCleanerService] Запущен с интервалом ${intervalMs}ms`);
    
    // Выполняем первую проверку сразу
    this.checkAndCleanQueues();

    this.intervalId = setInterval(() => {
      this.checkAndCleanQueues();
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[QueueCleanerService] Остановлен');
    }
  }

  private async checkAndCleanQueues(): Promise<void> {
    try {
      console.log('[QueueCleanerService] Проверка старых очередей');
      const oldQueues = await this.queuesService.cleanOldQueues();
      
      if (oldQueues.length > 0) {
        console.log(`[QueueCleanerService] Найдено и удалено ${oldQueues.length} старых очередей`);
      }
    } catch (error) {
      console.error('[QueueCleanerService] Ошибка при проверке старых очередей:', error);
    }
  }
}

