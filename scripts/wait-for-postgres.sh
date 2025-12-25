#!/bin/sh
# Скрипт для ожидания готовности PostgreSQL

set -e

host="$1"
shift
cmd="$@"

# Извлекаем параметры подключения из DATABASE_URL или используем переменные окружения
if [ -n "$DATABASE_URL" ]; then
  # Парсим DATABASE_URL: postgresql://user:password@host:port/database
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
  DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|postgresql://[^:]*:\([^@]*\)@.*|\1|p')
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
  
  # Если DATABASE_URL не удалось распарсить, используем переменные окружения
  if [ -z "$DB_HOST" ]; then
    DB_HOST=${host:-postgres}
    DB_USER=${POSTGRES_USER:-postgres}
    DB_PASS=${POSTGRES_PASSWORD}
    DB_NAME=${POSTGRES_DB:-postgres}
  fi
else
  DB_HOST=${host:-postgres}
  DB_USER=${POSTGRES_USER:-postgres}
  DB_PASS=${POSTGRES_PASSWORD}
  DB_NAME=${POSTGRES_DB:-postgres}
fi

>&2 echo "Ожидание готовности PostgreSQL на $DB_HOST..."

until PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
  >&2 echo "PostgreSQL недоступен - ожидание..."
  sleep 1
done

>&2 echo "PostgreSQL доступен - выполняем команду"
exec $cmd

