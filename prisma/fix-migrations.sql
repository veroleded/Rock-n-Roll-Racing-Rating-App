-- Скрипт для исправления failed migrations в Prisma
-- Выполнить этот скрипт в базе данных для очистки failed migrations

-- Проверить текущее состояние миграций
SELECT migration_name, started_at, finished_at, applied_steps_count, logs 
FROM "_prisma_migrations" 
ORDER BY started_at DESC;

-- Удалить failed migration (если она есть)
-- ВНИМАНИЕ: Используйте только если уверены, что миграция не была применена частично
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251225072205_init' 
AND finished_at IS NULL;

-- После удаления failed migration, можно применить миграции:
-- npx prisma migrate deploy
