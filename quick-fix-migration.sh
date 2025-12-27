#!/bin/bash
# Быстрое исправление миграции - выполните эту команду на сервере

docker exec -i rnr_racing_db_fedor psql -U postgres -d rnr_racing_db <<'EOF'
DELETE FROM "_prisma_migrations" WHERE migration_name = '20251225072205_init';
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (gen_random_uuid(), '', NOW(), '20251225072205_init', NULL, NULL, NOW() - INTERVAL '2 days', 1);
SELECT 'Миграция исправлена!' as status;
EOF

echo "Теперь перезапустите: docker-compose -f docker-compose.prod.fedor.yml restart app"

