FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm install -g tsx

COPY package*.json ./
RUN npm ci 

COPY . .

RUN mkdir -p public

EXPOSE 3000

CMD ["npm", "run", "start"]
