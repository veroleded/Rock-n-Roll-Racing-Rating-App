FROM node:20-alpine AS deps

WORKDIR /app

# Устанавливаем модули с использованием кеша слоев для ускорения сборки
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Сборка в отдельном слое
FROM node:20-alpine AS builder

WORKDIR /app

# Устанавливаем переменную для оптимизации памяти
ENV NODE_OPTIONS="--max-old-space-size=900"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Создаем директории, если они не существуют
RUN mkdir -p public
RUN mkdir -p scripts

# Генерируем Prisma клиент и билдим Next.js
RUN npx prisma generate
RUN npm run build

# Продакшен образ
FROM node:20-alpine AS runner

WORKDIR /app

# Указываем, что это продакшен среда
ENV NODE_ENV=production

# Устанавливаем tsx глобально для запуска бота
RUN npm install -g tsx

# Создаем необходимые директории
RUN mkdir -p public
RUN mkdir -p scripts

# Копируем необходимые файлы из предыдущего слоя
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Открываем порт 3000
EXPOSE 3000

# Запускаем приложение
CMD ["node", "server.js"]
