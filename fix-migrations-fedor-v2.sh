#!/bin/bash

# Более надежный скрипт для исправления миграций
# Использование: ./fix-migrations-fedor-v2.sh

set -e

echo "=========================================="
echo "Исправление миграций для FEDOR версии"
echo "=========================================="
echo ""

# Проверка, что контейнер базы данных запущен
if ! docker ps | grep -q rnr_racing_db_fedor; then
    echo "ОШИБКА: Контейнер rnr_racing_db_fedor не запущен!"
    echo "Запустите контейнеры: docker-compose -f docker-compose.prod.fedor.yml up -d"
    exit 1
fi

echo "Шаг 1: Подключение к базе данных и исправление миграций..."
echo ""

docker exec -i rnr_racing_db_fedor psql -U postgres -d rnr_racing_db <<'SQL'

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

-- Удалить ВСЕ записи о failed миграции init (и успешные тоже, чтобы пересоздать)
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251225072205_init';

-- Пометить init миграцию как успешно примененную
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

-- Проверить HIGH_MMR значения в enum GameMode
DO $$ 
DECLARE
    has_high_mmr BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TWO_VS_TWO_HIGH_MMR' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'GameMode')
    ) INTO has_high_mmr;
    
    IF has_high_mmr THEN
        -- Удалить старые записи
        DELETE FROM "_prisma_migrations" 
        WHERE migration_name = '20251225164901_add_high_mmr_game_modes';
        
        -- Пометить как примененную
        INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        VALUES (
            gen_random_uuid(),
            '',
            NOW(),
            '20251225164901_add_high_mmr_game_modes',
            NULL,
            NULL,
            NOW() - INTERVAL '1 day',
            1
        );
        RAISE NOTICE 'HIGH_MMR миграция помечена как примененная';
    ELSE
        RAISE NOTICE 'HIGH_MMR значения не найдены в enum, миграция будет применена позже';
    END IF;
END $$;

-- Проверить таблицу download_files
DO $$ 
DECLARE
    has_download_files BOOLEAN := FALSE;
    has_file_type BOOLEAN := FALSE;
BEGIN
    -- Проверить существование таблицы
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'download_files'
    ) INTO has_download_files;
    
    -- Проверить существование enum FileType
    SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'FileType'
    ) INTO has_file_type;
    
    IF has_download_files OR has_file_type THEN
        -- Удалить старые записи
        DELETE FROM "_prisma_migrations" 
        WHERE migration_name = '20251226100000_add_download_files';
        
        -- Пометить как примененную
        INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        VALUES (
            gen_random_uuid(),
            '',
            NOW(),
            '20251226100000_add_download_files',
            NULL,
            NULL,
            NOW() - INTERVAL '1 day',
            1
        );
        RAISE NOTICE 'DownloadFile миграция помечена как примененная';
    ELSE
        RAISE NOTICE 'Таблица download_files не найдена, миграция будет применена позже';
    END IF;
END $$;

-- Показать текущий статус миграций
SELECT 
    migration_name, 
    CASE 
        WHEN finished_at IS NOT NULL THEN 'APPLIED'
        ELSE 'PENDING'
    END as status,
    finished_at,
    applied_steps_count 
FROM "_prisma_migrations" 
ORDER BY started_at;

SQL

echo ""
echo "=========================================="
echo "Шаг 2: Проверка статуса миграций через Prisma"
echo "=========================================="
echo ""

# Проверка через Prisma
if docker ps | grep -q rnr_racing_app_fedor; then
    echo "Проверка статуса миграций..."
    docker exec rnr_racing_app_fedor npx prisma migrate status || echo "Приложение еще не запущено, это нормально"
else
    echo "Контейнер приложения не запущен, это нормально"
fi

echo ""
echo "=========================================="
echo "Готово!"
echo "=========================================="
echo ""
echo "Теперь перезапустите контейнер приложения:"
echo "  docker-compose -f docker-compose.prod.fedor.yml restart app"
echo ""
echo "Или перезапустите все контейнеры:"
echo "  docker-compose -f docker-compose.prod.fedor.yml down"
echo "  docker-compose -f docker-compose.prod.fedor.yml up -d"
echo ""

