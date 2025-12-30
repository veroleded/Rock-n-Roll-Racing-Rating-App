FROM node:20-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm install -g tsx

# Копируем package.json и устанавливаем все зависимости (включая devDependencies для сборки)
COPY package*.json ./
# Устанавливаем все зависимости, включая devDependencies (TypeScript нужен для сборки)
RUN npm ci --legacy-peer-deps --include=dev

# Копируем исходный код
COPY . .

# Создаем необходимые директории
RUN mkdir -p public uploads logs/metrics

# Устанавливаем NODE_ENV=production только для runtime
ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start"]
