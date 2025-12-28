# Диагностика проблемы с трафиком (44 ГБ за 4 часа)

## Выявленные проблемы:

### 1. ⚠️ КРИТИЧНО: Уязвимость в Next.js 15.1.7

**Текущая версия:** Next.js 15.1.7  
**Рекомендуемая версия:** 15.1.9, 15.2.6, 15.3.6, 15.4.8, 15.5.7, или 16.0.6

Хостинг провайдер указал, что эта уязвимость вызывает **сильную нагрузку на сервер** и может быть причиной высокого использования ресурсов.

### 2. Возможная проблема: Множественная инициализация бота

В `docker-compose.prod.bogdan.yml` команда запуска:

```yaml
command: >
  sh -c "npx prisma migrate deploy &&
         npx prisma generate &&
         npm run build &&
         (npm run init-bots || echo 'Warning: bot initialization failed, continuing...') &&
         (npm run start & tsx src/bot/index.ts)"
```

Проблема: `tsx src/bot/index.ts` запускается без защиты от множественного запуска. Если процесс падает и перезапускается, может создаваться несколько экземпляров бота, что приводит к:

- Множественным подключениям к Discord API
- Множественным подпискам на Redis события
- Утечке памяти и трафика

### 3. Redis подписки без проверки дубликатов

В `queue-events.ts` и `match-events.ts` есть защита от дубликатов, но если бот перезапускается, могут создаваться новые подписки.

### 4. Отсутствие обработки ошибок при переподключении

Если Discord бот теряет соединение, он может пытаться переподключиться бесконечно, генерируя трафик.

## Рекомендуемые исправления:

### Приоритет 1: Обновление Next.js (КРИТИЧНО)

```bash
npm install next@15.1.9
# или
npm install next@15.5.7
```

### Приоритет 2: Защита от множественного запуска бота

Создать файл `src/bot/singleton.ts`:

```typescript
// Защита от множественного запуска
let botInstance: any = null;
let isRunning = false;

export function ensureSingleInstance() {
  if (isRunning) {
    console.error('Bot уже запущен! Останавливаю дубликат...');
    process.exit(1);
  }
  isRunning = true;

  process.on('exit', () => {
    isRunning = false;
  });
}
```

И использовать в `src/bot/index.ts`:

```typescript
import { ensureSingleInstance } from './singleton';

ensureSingleInstance();
// ... остальной код
```

### Приоритет 3: Улучшение обработки ошибок Discord бота

Добавить обработку переподключений с ограничением:

```typescript
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
  reconnectAttempts++;

  if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    console.error('Превышено максимальное количество попыток переподключения. Останавливаю бота.');
    process.exit(1);
  }
});
```

### Приоритет 4: Проверка и ограничение Redis подписок

Убедиться, что подписки создаются только один раз при инициализации.

## Немедленные действия:

1. **Обновить Next.js до безопасной версии**
2. **Проверить логи сервера** на предмет ошибок переподключения
3. **Добавить мониторинг** трафика и памяти
4. **Ограничить количество переподключений** бота

## Проверка логов:

После исправления проверьте:

```bash
# Логи приложения
docker-compose -f docker-compose.prod.bogdan.yml logs app | grep -i "error\|reconnect\|redis\|discord"

# Использование памяти и CPU
docker stats rnr_racing_app_bogdan

# Сетевую активность
docker exec rnr_racing_app_bogdan netstat -i
```
