#!/bin/bash

echo "Starting local database initialization..."

# Запуск PostgreSQL
echo "Starting PostgreSQL..."
docker-compose -f docker-compose.local.yml up -d postgres

# Ожидание готовности PostgreSQL
echo "Waiting for PostgreSQL to be ready..."
sleep 15

# Применение миграций
echo "Applying Prisma migrations..."
docker-compose -f docker-compose.local.yml run --rm nextjs npx prisma migrate deploy

# Инициализация ботов
echo "Initializing bots..."
docker-compose -f docker-compose.local.yml run --rm nextjs npx tsx prisma/init-bots.ts

echo "Local database initialization completed!" 