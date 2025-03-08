#!/bin/sh

# Запуск миграций
npx prisma migrate deploy

# Инициализация ботов
node prisma/init-bots.ts

# Сборка Next.js приложения
npm run build

# Запуск Next.js и Discord бота параллельно
npm run start & npm run bot 