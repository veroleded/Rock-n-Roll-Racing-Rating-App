FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

ENV NEXT_TELEMETRY_DISABLED=1

# Установка netcat для проверки доступности PostgreSQL
RUN apk add --no-cache netcat-openbsd

RUN npm install -g tsx

COPY package*.json ./
RUN npm ci 

COPY . .

RUN mkdir -p public
RUN mkdir -p scripts

EXPOSE 3000

CMD ["npm", "run", "start"]
