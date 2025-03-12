FROM node:20-alpine

WORKDIR /app

# Копируем файлы зависимостей и устанавливаем зависимости
COPY package*.json ./
RUN npm install && npm cache clean --force

# Копируем весь код проекта
COPY . .

# Генерируем Prisma клиент и билдим Next.js
RUN npx prisma generate && npm run build

# Открываем порт 3000
EXPOSE 3000

# Запускаем миграции, бота и Next.js
CMD npx prisma migrate deploy && npm run init-bots && (npm run start & npm run bot)
