#!/bin/bash

# Скрипт для исправления ошибки миграции в FEDOR версии
# Использование: ./fix-migrations-fedor.sh

echo "Исправление миграций для FEDOR версии..."

# Подключение к базе данных и исправление миграций
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

-- Удалить failed migration записи для init миграции
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251225072205_init' 
AND (finished_at IS NULL OR finished_at IS NOT NULL);

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
        -- Удалить failed записи
        DELETE FROM "_prisma_migrations" 
        WHERE migration_name = '20251225164901_add_high_mmr_game_modes';
        
        -- Пометить как примененную
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
            AND finished_at IS NOT NULL
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
        -- Удалить failed записи
        DELETE FROM "_prisma_migrations" 
        WHERE migration_name = '20251226100000_add_download_files';
        
        -- Пометить как примененную
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
            AND finished_at IS NOT NULL
        );
    ELSE
        -- Если таблицы нет, но enum FileType есть, создадим таблицу
        IF EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'FileType'
        ) THEN
            -- Таблица должна быть создана миграцией, но если её нет, создадим
            CREATE TABLE IF NOT EXISTS "download_files" (
                "id" TEXT NOT NULL,
                "type" "FileType" NOT NULL,
                "file_name" TEXT NOT NULL,
                "file_path" TEXT NOT NULL,
                "file_size" INTEGER NOT NULL,
                "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "uploaded_by" TEXT NOT NULL,
                CONSTRAINT "download_files_pkey" PRIMARY KEY ("id")
            );
            
            CREATE UNIQUE INDEX IF NOT EXISTS "download_files_type_key" ON "download_files"("type");
            
            -- Пометить миграцию как примененную
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
                AND finished_at IS NOT NULL
            );
        END IF;
    END IF;
END \$\$;

-- Показать текущий статус миграций
SELECT migration_name, finished_at, applied_steps_count 
FROM "_prisma_migrations" 
ORDER BY started_at;

EOF

echo ""
echo "Миграции исправлены!"
echo ""
echo "Теперь перезапустите контейнер приложения:"
echo "  docker-compose -f docker-compose.prod.fedor.yml restart app"
echo ""
echo "Или проверьте статус миграций:"
echo "  docker exec -it rnr_racing_app_fedor npx prisma migrate status"

