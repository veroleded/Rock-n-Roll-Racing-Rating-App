FROM node:20-alpine

WORKDIR /app

# Увеличиваем доступную память для Node.js
ENV NODE_OPTIONS="--max-old-space-size=900"
ENV NODE_ENV=production

# Отключаем телеметрию Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Устанавливаем tsx и eslint для сборки и запуска
RUN npm install -g tsx

# Копируем файлы зависимостей и устанавливаем зависимости
COPY package*.json ./
RUN npm ci 

# Копируем весь код проекта
COPY . .

# Создаем директории, если они не существуют
RUN mkdir -p public
RUN mkdir -p scripts

# Открываем порт 3000
EXPOSE 3000

# Команда запуска будет передана из docker-compose
