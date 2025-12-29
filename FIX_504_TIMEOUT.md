# Исправление проблемы 504 Gateway Time-out

## Проблема
Приложение работало несколько часов, но затем фронтенд переставал работать с ошибкой 504 Gateway Time-out. В логах nginx были видны ошибки "upstream timed out".

## Причины проблемы

1. **Отсутствие таймаутов в nginx** - nginx ждал ответа от приложения бесконечно
2. **Нет ограничений на память** - контейнер мог исчерпать память и зависнуть
3. **Нет health checks** - Docker не мог определить, что приложение зависло
4. **Неоптимальные настройки PostgreSQL** - отсутствие ограничений на соединения
5. **Частые запросы к БД от бота** - setInterval каждые 10 секунд создавал нагрузку
6. **Нет обработки ошибок подключения** - при проблемах с БД приложение могло зависнуть

## Внесенные изменения

### 1. ✅ Настройка таймаутов в nginx (`nginx.conf`)
- Добавлены таймауты: `proxy_connect_timeout`, `proxy_send_timeout`, `proxy_read_timeout`
- Добавлен health check endpoint `/health`
- Улучшена буферизация для статических файлов

### 2. ✅ Health check endpoint (`src/app/api/health/route.ts`)
- Создан endpoint `/api/health` для проверки состояния приложения
- Проверяет подключение к базе данных
- Возвращает статус 200 при успехе, 503 при ошибке

### 3. ✅ Ограничения ресурсов в docker-compose (`docker-compose.prod.yml`)
- Добавлен `mem_limit: 1g` для контейнера app
- Добавлен `mem_reservation: 512m`
- Добавлен health check для автоматического перезапуска при зависании
- Настроены параметры PostgreSQL:
  - `max_connections=50` - ограничение количества соединений
  - `connection_timeout=10` - таймаут подключения
  - `idle_in_transaction_session_timeout=30000` - таймаут для зависших транзакций
  - `statement_timeout=30000` - таймаут для долгих запросов

### 4. ✅ Улучшение Prisma Client (`src/lib/prisma.ts`)
- Добавлена обработка ошибок подключения
- Добавлен graceful shutdown при завершении процесса
- Улучшено логирование ошибок

### 5. ✅ Оптимизация бота (`src/bot/index.ts`)
- Увеличен интервал проверки очередей с 10 до 30 секунд
- Улучшена обработка ошибок

## Инструкция по применению на сервере

### Шаг 1: Обновить код на сервере

```bash
cd /path/to/Rock-n-Roll-Racing-Rating-App
git pull
```

### Шаг 2: Настроить connection pool в DATABASE_URL (ВАЖНО!)

В файле `.env.prod` обновите `DATABASE_URL`, добавив параметры connection pool:

```env
# Было:
DATABASE_URL="postgresql://user:password@postgres:5432/dbname?schema=public"

# Должно быть:
DATABASE_URL="postgresql://user:password@postgres:5432/dbname?schema=public&connection_limit=10&pool_timeout=20"
```

**Параметры:**
- `connection_limit=10` - максимальное количество соединений в пуле (рекомендуется 10-20 для продакшена)
- `pool_timeout=20` - таймаут ожидания свободного соединения в секундах

### Шаг 3: Пересобрать и перезапустить контейнеры

```bash
# Остановить контейнеры
docker-compose -f docker-compose.prod.yml down

# Пересобрать и запустить
docker-compose -f docker-compose.prod.yml up -d --build
```

### Шаг 4: Проверить работу

```bash
# Проверить статус контейнеров
docker-compose -f docker-compose.prod.yml ps

# Проверить health check
curl http://localhost/api/health

# Проверить логи
docker-compose -f docker-compose.prod.yml logs -f app
```

### Шаг 5: Мониторинг

После применения изменений следите за:

1. **Логами nginx:**
```bash
docker-compose -f docker-compose.prod.yml logs nginx | grep -i "timeout\|error"
```

2. **Логами приложения:**
```bash
docker-compose -f docker-compose.prod.yml logs app | tail -50
```

3. **Использованием памяти:**
```bash
docker stats rnr_racing_app
```

4. **Health check:**
```bash
# Должен возвращать {"status":"ok","timestamp":"..."}
curl http://localhost/api/health
```

## Дополнительные рекомендации

### Если проблема повторится:

1. **Проверьте использование памяти:**
```bash
docker stats
```

2. **Проверьте количество соединений к БД:**
```bash
docker exec rnr_racing_db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'your_database_name';"
```

3. **Проверьте логи приложения на ошибки:**
```bash
docker-compose -f docker-compose.prod.yml logs app | grep -i "error\|timeout\|prisma"
```

4. **Проверьте размер базы данных:**
```bash
docker exec rnr_racing_db psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('your_database_name'));"
```

### Оптимизация connection pool

Если видите ошибки "Too many connections", уменьшите `connection_limit` в DATABASE_URL:

```env
# Для маломощного сервера
DATABASE_URL="...&connection_limit=5&pool_timeout=20"

# Для более мощного сервера
DATABASE_URL="...&connection_limit=20&pool_timeout=20"
```

### Автоматический перезапуск при проблемах

Health check в docker-compose автоматически перезапустит контейнер, если:
- Health check endpoint не отвечает 3 раза подряд
- Интервал проверки: 30 секунд
- Таймаут проверки: 10 секунд

## Что было исправлено

✅ Таймауты в nginx для предотвращения бесконечного ожидания  
✅ Health check endpoint для мониторинга состояния  
✅ Ограничения памяти для предотвращения утечек  
✅ Настройки PostgreSQL для предотвращения исчерпания соединений  
✅ Оптимизация частоты запросов бота к БД  
✅ Улучшенная обработка ошибок в Prisma Client  
✅ Graceful shutdown для корректного закрытия соединений  

## Важные замечания

⚠️ **Обязательно обновите DATABASE_URL** с параметрами connection pool, иначе проблема может повториться!

⚠️ После применения изменений приложение будет автоматически перезапускаться при зависании благодаря health check.

⚠️ Если проблема сохраняется, проверьте логи и использование ресурсов сервера.

