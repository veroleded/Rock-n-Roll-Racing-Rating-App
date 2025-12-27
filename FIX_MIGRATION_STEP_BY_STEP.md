# Пошаговое исправление ошибки миграции FEDOR

## Проблема
Prisma пытается применить миграцию `20251225072205_init`, но типы уже существуют в базе, что вызывает ошибку.

## Решение (выполняйте по порядку)

### Шаг 1: Остановите контейнер приложения

```bash
docker-compose -f docker-compose.prod.fedor.yml stop app
```

### Шаг 2: Подключитесь к базе данных

```bash
docker exec -it rnr_racing_db_fedor psql -U postgres -d rnr_racing_db
```

### Шаг 3: Выполните SQL команды

Скопируйте и выполните следующие команды в psql:

```sql
-- Проверьте текущее состояние миграций
SELECT migration_name, finished_at, started_at 
FROM "_prisma_migrations" 
ORDER BY started_at;

-- Удалите ВСЕ записи о failed миграции init
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251225072205_init';

-- Пометите init миграцию как успешно примененную
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    gen_random_uuid(),
    '',
    NOW(),
    '20251225072205_init',
    NULL,
    NULL,
    NOW() - INTERVAL '2 days',
    1
);

-- Проверьте результат
SELECT migration_name, finished_at, started_at 
FROM "_prisma_migrations" 
ORDER BY started_at;
```

### Шаг 4: Выйдите из psql

```sql
\q
```

### Шаг 5: Перезапустите контейнер приложения

```bash
docker-compose -f docker-compose.prod.fedor.yml start app
```

Или перезапустите все:

```bash
docker-compose -f docker-compose.prod.fedor.yml restart app
```

### Шаг 6: Проверьте логи

```bash
docker-compose -f docker-compose.prod.fedor.yml logs -f app
```

Должно быть видно, что миграции применены успешно или что новых миграций нет.

## Альтернативный способ (если контейнер app не запускается)

Если контейнер app не может запуститься из-за ошибки миграции, временно измените команду запуска:

1. Отредактируйте `docker-compose.prod.fedor.yml`
2. Временно закомментируйте `npx prisma migrate deploy`:

```yaml
command: >
  sh -c "npx prisma generate &&
         npm run build &&
         (npm run init-bots || echo 'Warning: bot initialization failed, continuing...') &&
         (npm run start & tsx src/bot/index.ts)"
```

3. Запустите контейнер
4. Исправьте миграции через SQL (шаги 2-4 выше)
5. Верните `npx prisma migrate deploy` обратно
6. Перезапустите контейнер

## Быстрый способ (скрипт)

Или используйте готовый SQL файл:

```bash
# Скопируйте fix-migration-manual.sql на сервер
# Затем выполните:
docker exec -i rnr_racing_db_fedor psql -U postgres -d rnr_racing_db < fix-migration-manual.sql

# Перезапустите контейнер
docker-compose -f docker-compose.prod.fedor.yml restart app
```

## Проверка после исправления

```bash
# Проверьте статус миграций
docker exec rnr_racing_app_fedor npx prisma migrate status

# Должно показать, что все миграции применены
```

