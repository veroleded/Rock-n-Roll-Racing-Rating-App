# ========== Stage 1: Builder ==========
FROM node:20-alpine AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Подготовка standalone: добавляем static и public (если есть)
RUN cp -r .next/static .next/standalone/.next/ && \
    ([ -d public ] && cp -r public .next/standalone/) || true

# ========== Stage 2: Runner ==========
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache netcat-openbsd

# Next.js standalone (минимальный размер)
COPY --from=builder /app/.next/standalone ./standalone

# Production зависимости только для бота (prisma, discord.js, tsx)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Предсгенерированный Prisma Client (обновится при старте если схема изменилась)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

EXPOSE 3000

CMD ["sh", "-c", \
  "echo 'Ожидание PostgreSQL...' && \
   until nc -z postgres 5432; do sleep 2; done && \
   echo 'PostgreSQL готов!' && \
   npx prisma generate && \
   echo 'Запуск приложения и бота...' && \
   (cd standalone && node server.js) & npx tsx src/bot/index.ts"]
