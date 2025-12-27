#!/bin/bash

# Безопасный скрипт для обновления FEDOR production версии
# Автоматически делает бэкап базы данных перед любыми изменениями
# Использование: ./update-fedor-production.sh

set -e  # Остановить при любой ошибке

echo "=========================================="
echo "Обновление FEDOR Production версии"
echo "=========================================="
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка, что мы в правильной директории
if [ ! -f "docker-compose.prod.fedor.yml" ]; then
    error "Файл docker-compose.prod.fedor.yml не найден!"
    error "Запустите скрипт из корневой директории проекта"
    exit 1
fi

# Проверка, что контейнеры запущены
info "Проверка контейнеров..."
if ! docker ps | grep -q rnr_racing_db_fedor; then
    error "Контейнер базы данных не запущен!"
    error "Запустите: docker-compose -f docker-compose.prod.fedor.yml up -d"
    exit 1
fi

# Шаг 1: Бэкап базы данных
echo ""
info "Шаг 1: Создание бэкапа базы данных..."
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

# Получаем имя базы данных из переменных окружения или используем дефолтное
DB_NAME="${POSTGRES_DB:-rnr_racing_db}"

if docker exec rnr_racing_db_fedor pg_dump -U postgres "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
    info "Бэкап создан: $BACKUP_FILE"
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    info "Размер бэкапа: $BACKUP_SIZE"
else
    error "Не удалось создать бэкап!"
    error "Проверьте, что контейнер базы данных запущен и доступен"
    exit 1
fi

# Шаг 2: Проверка текущего состояния миграций
echo ""
info "Шаг 2: Проверка текущего состояния миграций..."

MIGRATION_STATUS=$(docker exec rnr_racing_db_fedor psql -U postgres -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"_prisma_migrations\" WHERE migration_name = '20251225072205_init' AND finished_at IS NULL;" 2>/dev/null | tr -d ' ')

if [ "$MIGRATION_STATUS" = "0" ] || [ -z "$MIGRATION_STATUS" ]; then
    info "Failed миграций не найдено, проверяю существующие записи..."
    EXISTING=$(docker exec rnr_racing_db_fedor psql -U postgres -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"_prisma_migrations\" WHERE migration_name = '20251225072205_init';" 2>/dev/null | tr -d ' ')
    
    if [ "$EXISTING" = "0" ] || [ -z "$EXISTING" ]; then
        warn "Запись о миграции init не найдена, будет создана новая"
    else
        info "Найдена запись о миграции init, будет обновлена"
    fi
else
    warn "Найдена failed миграция, будет исправлена"
fi

# Шаг 3: Исправление миграций
echo ""
info "Шаг 3: Исправление миграций..."

docker exec -i rnr_racing_db_fedor psql -U postgres -d "$DB_NAME" <<'SQL'

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

-- Удалить все записи о миграции init (безопасно, так как мы создадим новую)
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

-- Проверить и пометить HIGH_MMR миграцию, если значения уже есть
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
END $$;

-- Проверить и пометить DownloadFile миграцию, если таблица или enum уже существуют
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
END $$;

SQL

if [ $? -eq 0 ]; then
    info "Миграции успешно исправлены!"
else
    error "Ошибка при исправлении миграций!"
    error "Бэкап сохранен в: $BACKUP_FILE"
    error "Вы можете восстановить базу данных из бэкапа"
    exit 1
fi

# Шаг 4: Проверка результата
echo ""
info "Шаг 4: Проверка результата..."

MIGRATION_CHECK=$(docker exec rnr_racing_db_fedor psql -U postgres -d "$DB_NAME" -t -c "SELECT migration_name, CASE WHEN finished_at IS NOT NULL THEN 'APPLIED' ELSE 'PENDING' END as status FROM \"_prisma_migrations\" WHERE migration_name = '20251225072205_init';" 2>/dev/null)

if echo "$MIGRATION_CHECK" | grep -q "APPLIED"; then
    info "✓ Миграция init помечена как примененная"
else
    warn "⚠ Не удалось проверить статус миграции"
fi

# Шаг 5: Перезапуск контейнера приложения
echo ""
info "Шаг 5: Перезапуск контейнера приложения..."

if docker ps | grep -q rnr_racing_app_fedor; then
    info "Остановка контейнера приложения..."
    docker-compose -f docker-compose.prod.fedor.yml stop app
    
    info "Запуск контейнера приложения..."
    docker-compose -f docker-compose.prod.fedor.yml start app
    
    # Ждем немного, чтобы контейнер запустился
    sleep 5
    
    # Проверяем логи
    info "Проверка логов (последние 20 строк)..."
    docker-compose -f docker-compose.prod.fedor.yml logs --tail=20 app
else
    warn "Контейнер приложения не запущен, запускаю..."
    docker-compose -f docker-compose.prod.fedor.yml up -d app
    sleep 5
    docker-compose -f docker-compose.prod.fedor.yml logs --tail=20 app
fi

# Финальная проверка
echo ""
info "Шаг 6: Финальная проверка..."

if docker ps | grep -q rnr_racing_app_fedor; then
    APP_STATUS=$(docker inspect rnr_racing_app_fedor --format='{{.State.Status}}')
    if [ "$APP_STATUS" = "running" ]; then
        info "✓ Контейнер приложения запущен"
        
        # Проверка миграций через Prisma (если доступно)
        if docker exec rnr_racing_app_fedor npx prisma migrate status > /dev/null 2>&1; then
            info "Проверка статуса миграций через Prisma:"
            docker exec rnr_racing_app_fedor npx prisma migrate status || true
        fi
    else
        warn "⚠ Контейнер приложения в статусе: $APP_STATUS"
    fi
else
    error "✗ Контейнер приложения не запущен!"
fi

# Итоговая информация
echo ""
echo "=========================================="
echo "Обновление завершено!"
echo "=========================================="
echo ""
info "Бэкап базы данных: $BACKUP_FILE"
info "Размер бэкапа: $BACKUP_SIZE"
echo ""
warn "ВАЖНО: Сохраните бэкап в безопасном месте!"
warn "Для восстановления из бэкапа выполните:"
echo "  docker exec -i rnr_racing_db_fedor psql -U postgres $DB_NAME < $BACKUP_FILE"
echo ""
info "Проверьте логи приложения:"
echo "  docker-compose -f docker-compose.prod.fedor.yml logs -f app"
echo ""

