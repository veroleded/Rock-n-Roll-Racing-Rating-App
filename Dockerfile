FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install && \
    npm install -g ts-node typescript && \
    npm cache clean --force

COPY . .

RUN npx prisma generate && \
    npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.* ./

RUN npm install -g ts-node typescript && \
    npm cache clean --force

EXPOSE 3000

CMD npx prisma migrate deploy && npx ts-node prisma/init-bots.ts && (npm run start & npm run bot) 