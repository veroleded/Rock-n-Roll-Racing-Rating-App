FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate

# Запуск миграций и инициализация при старте
RUN echo "#!/bin/sh\n\
npx prisma migrate deploy\n\
node prisma/init-bots.ts\n\
npm run build\n\
npm run start & npm run bot" > start.sh \
&& chmod +x start.sh

EXPOSE 3000

CMD ["/bin/sh", "start.sh"] 