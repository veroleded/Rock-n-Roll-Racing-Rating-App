FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npm install -g ts-node typescript

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD npx prisma migrate deploy && npx ts-node prisma/init-bots.ts && npm run build && (npm run start & npm run bot) 