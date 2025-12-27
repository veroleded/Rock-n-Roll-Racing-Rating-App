# Исправление ошибки миграции для FEDOR версии

## Проблема

База данных уже существует, но Prisma пытается применить миграцию `20251225072205_init`, которая пытается создать уже существующие типы (например, `Role`). Это происходит потому, что таблица `_prisma_migrations` либо не существует, либо не содержит запись о том, что миграции уже применены.

## Решение

### Вариант 1: Пометить существующие миграции как примененные (рекомендуется)

Подключитесь к базе данных и выполните следующие SQL команды:

```bash
# Подключитесь к контейнеру базы данных
docker exec -it rnr_racing_db_fedor psql -U postgres -d rnr_racing_db
```

Затем выполните SQL:

```sql
-- Проверьте, существует ли таблица миграций
SELECT * FROM "_prisma_migrations";

-- Если таблица пустая или не существует, создайте записи о примененных миграциях
-- Сначала убедитесь, что таблица существует
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

-- Пометить init миграцию как примененную (если еще не помечена)
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    gen_random_uuid(),
    'init_migration_checksum', -- Замените на реальный checksum из файла миграции
    NOW(),
    '20251225072205_init',
    NULL,
    NULL,
    NOW() - INTERVAL '1 day', -- Установите время в прошлом
    1
) ON CONFLICT DO NOTHING;

-- Пометить HIGH_MMR миграцию как примененную (если значения уже есть в enum)
-- Сначала проверьте, есть ли эти значения
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'GameMode')
ORDER BY enumsortorder;

-- Если значения TWO_VS_TWO_HIGH_MMR и THREE_VS_THREE_HIGH_MMR уже есть, пометьте миграцию
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    gen_random_uuid(),
    'high_mmr_migration_checksum',
    NOW(),
    '20251225164901_add_high_mmr_game_modes',
    NULL,
    NULL,
    NOW() - INTERVAL '1 day',
    1
) ON CONFLICT DO NOTHING;

-- Пометить DownloadFile миграцию как примененную (если таблица уже существует)
-- Сначала проверьте, существует ли таблица
SELECT * FROM download_files LIMIT 1;

-- Если таблица существует, пометьте миграцию
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    gen_random_uuid(),
    'download_files_migration_checksum',
    NOW(),
    '20251226100000_add_download_files',
    NULL,
    NULL,
    NOW() - INTERVAL '1 day',
    1
) ON CONFLICT DO NOTHING;
```

### Вариант 2: Удалить failed migration и пометить как resolved

```sql
-- Удалить запись о failed migration
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251225072205_init' 
AND finished_at IS NULL;

-- Пометить как успешно примененную
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    gen_random_uuid(),
    'init_migration_checksum',
    NOW(),
    '20251225072205_init',
    NULL,
    NULL,
    NOW() - INTERVAL '1 day',
    1
);
```

### Вариант 3: Использовать prisma migrate resolve (если доступен)

```bash
# Войдите в контейнер приложения
docker exec -it rnr_racing_app_fedor sh

# Разрешите failed migration
npx prisma migrate resolve --applied 20251225072205_init

# Выйдите из контейнера
exit
```

## Автоматический скрипт для исправления

Создайте файл `fix-migrations.sh` на сервере:

```bash
#!/bin/bash

# Подключение к базе данных
docker exec -i rnr_racing_db_fedor psql -U postgres -d rnr_racing_db <<EOF

-- Создать таблицу миграций, если не существует
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

-- Удалить failed migration записи
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251225072205_init' 
AND finished_at IS NULL;

-- Пометить init миграцию как примененную
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
SELECT 
    gen_random_uuid(),
    '',
    NOW(),
    '20251225072205_init',
    NULL,
    NULL,
    NOW() - INTERVAL '1 day',
    1
WHERE NOT EXISTS (
    SELECT 1 FROM "_prisma_migrations" 
    WHERE migration_name = '20251225072205_init' 
    AND finished_at IS NOT NULL
);

-- Проверить и пометить HIGH_MMR миграцию, если значения уже есть
DO \$\$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TWO_VS_TWO_HIGH_MMR' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'GameMode')
    ) THEN
        INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        SELECT 
            gen_random_uuid(),
            '',
            NOW(),
            '20251225164901_add_high_mmr_game_modes',
            NULL,
            NULL,
            NOW() - INTERVAL '1 day',
            1
        WHERE NOT EXISTS (
            SELECT 1 FROM "_prisma_migrations" 
            WHERE migration_name = '20251225164901_add_high_mmr_game_modes'
        );
    END IF;
END \$\$;

-- Проверить и пометить DownloadFile миграцию, если таблица существует
DO \$\$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'download_files'
    ) THEN
        INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        SELECT 
            gen_random_uuid(),
            '',
            NOW(),
            '20251226100000_add_download_files',
            NULL,
            NULL,
            NOW() - INTERVAL '1 day',
            1
        WHERE NOT EXISTS (
            SELECT 1 FROM "_prisma_migrations" 
            WHERE migration_name = '20251226100000_add_download_files'
        );
    END IF;
END \$\$;

EOF

echo "Миграции исправлены. Теперь можно перезапустить контейнеры."
```

Затем выполните:

```bash
chmod +x fix-migrations.sh
./fix-migrations.sh
```

## После исправления

1. Перезапустите контейнеры:
```bash
docker-compose -f docker-compose.prod.fedor.yml restart app
```

2. Проверьте статус миграций:
```bash
docker exec -it rnr_racing_app_fedor npx prisma migrate status
```

3. Если все миграции помечены как примененные, приложение должно запуститься успешно.

## Проверка

После исправления проверьте:

```sql
-- Проверьте все примененные миграции
SELECT migration_name, finished_at, applied_steps_count 
FROM "_prisma_migrations" 
ORDER BY started_at;

-- Должны быть видны:
-- 20251225072205_init
-- 20251225164901_add_high_mmr_game_modes (если значения уже есть)
-- 20251226100000_add_download_files (если таблица уже существует)
```

