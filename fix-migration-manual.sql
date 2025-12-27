-- Ручное исправление миграций для FEDOR версии
-- Выполните этот SQL в базе данных:
-- docker exec -it rnr_racing_db_fedor psql -U postgres -d rnr_racing_db

-- 1. Убедитесь, что таблица миграций существует
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

-- 2. Удалить ВСЕ записи о failed миграции init
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251225072205_init';

-- 3. Пометить init миграцию как успешно примененную
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

-- 4. Проверить и пометить HIGH_MMR миграцию (если значения уже есть)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TWO_VS_TWO_HIGH_MMR' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'GameMode')
    ) THEN
        DELETE FROM "_prisma_migrations" 
        WHERE migration_name = '20251225164901_add_high_mmr_game_modes';
        
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
    END IF;
END $$;

-- 5. Проверить и пометить DownloadFile миграцию (если таблица или enum уже есть)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'download_files'
    ) OR EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'FileType'
    ) THEN
        DELETE FROM "_prisma_migrations" 
        WHERE migration_name = '20251226100000_add_download_files';
        
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
    END IF;
END $$;

-- 6. Показать итоговый статус
SELECT 
    migration_name, 
    CASE 
        WHEN finished_at IS NOT NULL THEN 'APPLIED ✓'
        ELSE 'PENDING'
    END as status,
    finished_at,
    applied_steps_count 
FROM "_prisma_migrations" 
ORDER BY started_at;

