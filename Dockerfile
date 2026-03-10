# ========== Stage 1: Builder ==========
FROM node:20-alpine AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Подготовка standalone: добавляем static и public
RUN cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/

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

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

EXPOSE 3000

CMD ["sh", "-c", \
  "echo 'Ожидание PostgreSQL...' && \
   until nc -z postgres 5432; do sleep 2; done && \
   echo 'PostgreSQL готов!' && \
   npx prisma generate && \
   echo 'Запуск приложения и бота...' && \
   (cd standalone && node server.js) & tsx src/bot/index.ts"]
