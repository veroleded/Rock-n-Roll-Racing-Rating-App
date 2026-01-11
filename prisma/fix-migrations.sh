#!/bin/bash

# Скрипт для исправления failed migrations в Prisma
# Использование: ./prisma/fix-migrations.sh

set -e

echo "🔧 Исправление failed migrations в Prisma..."
echo ""

# Проверка наличия DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Ошибка: DATABASE_URL не установлен"
    echo "Установите переменную окружения DATABASE_URL или загрузите .env файл"
    exit 1
fi

# Получение параметров подключения из DATABASE_URL
# Формат: postgresql://user:password@host:port/database

DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📊 Параметры подключения:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Проверка текущего состояния миграций
echo "📋 Текущие миграции в базе данных:"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT migration_name, started_at, finished_at, applied_steps_count 
FROM \"_prisma_migrations\" 
ORDER BY started_at DESC 
LIMIT 10;
" || {
    echo "❌ Ошибка при подключении к базе данных"
    exit 1
}

echo ""
read -p "Показать failed migrations? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Failed migrations:"
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT migration_name, started_at, finished_at, logs 
    FROM \"_prisma_migrations\" 
    WHERE finished_at IS NULL 
    ORDER BY started_at DESC;
    "
    echo ""
fi

# Подтверждение удаления failed migrations
echo "⚠️  ВНИМАНИЕ: Будут удалены записи о failed migrations"
echo "   Это безопасно только если миграции не были применены частично"
echo ""
read -p "Удалить failed migrations? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Удаление failed migrations..."
    
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    DELETE FROM \"_prisma_migrations\" 
    WHERE finished_at IS NULL;
    " || {
        echo "❌ Ошибка при удалении failed migrations"
        exit 1
    }
    
    echo "✅ Failed migrations удалены"
    echo ""
    echo "📋 Текущие миграции после удаления:"
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT migration_name, started_at, finished_at, applied_steps_count 
    FROM \"_prisma_migrations\" 
    ORDER BY started_at DESC 
    LIMIT 10;
    "
    echo ""
    echo "✅ Теперь можно применить миграции:"
    echo "   npx prisma migrate deploy"
else
    echo "❌ Отменено"
    exit 0
fi
