FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate

# Скрипт для запуска всех сервисов
COPY start.sh .
RUN chmod +x start.sh

EXPOSE 3000

CMD ["./start.sh"] 