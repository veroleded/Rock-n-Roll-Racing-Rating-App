# Discord Bot & Web App — Rock n' Roll Racing

## Описание

Многофункциональный Discord-бот и веб-приложение для организации матчей, ведения рейтинга, сбора статистики и управления очередями игроков по легендарной игре **Rock n' Roll Racing**. Проект включает:
- Discord-бота с командами для управления очередями, статистикой и рейтингом
- Современный веб-интерфейс (Next.js) для просмотра профиля, матчей, статистики и управления пользователями
- Интеграцию с Discord OAuth
- Админ-панель и гибкую систему ролей

> **Rock n' Roll Racing** — культовая аркадная гоночная игра от Blizzard (SNES/SEGA, 1993). Подробнее: [Wikipedia](https://en.wikipedia.org/wiki/Rock_n%27_Roll_Racing)

---

## Short Description (EN)

**Discord bot & web app for organizing Rock n' Roll Racing matches, player rating, and statistics. Modern Next.js frontend, Discord OAuth, queue management, and admin panel.**

---

## Основные фичи
- Авторизация через Discord
- Очереди на матчи (2x2, 3x3, 2x2x2) с ботами и автосбором команд для Rock n' Roll Racing
- Рейтинг игроков, топ/антитоп, подробная статистика по матчам RnR Racing
- История матчей, фильтры, просмотр профилей
- Админка: управление пользователями, ботами, матчами
- Гибкая система ролей (ADMIN, MODERATOR, PLAYER)
- Современный UI (Tailwind, shadcn/ui)

---

## Технологии
- **Next.js** 15 (App Router, SSR)
- **TypeScript**
- **Prisma ORM** + PostgreSQL
- **discord.js** (бот)
- **tRPC** (API)
- **NextAuth** (Discord OAuth)
- **Tailwind CSS** + shadcn/ui
- **Docker** + docker-compose

---

## Быстрый старт (локально)

1. Клонируйте репозиторий:
   ```bash
   git clone <repo_url>
   cd discord-bot-new
   ```
2. Установите зависимости:
   ```bash
   npm install
   ```
3. Создайте файл `.env` (пример ниже)
4. Запустите PostgreSQL (или используйте Docker)
5. Примените миграции и заполните тестовые данные:
   ```bash
   npx prisma migrate deploy
   npm run seed
   npm run init-bots
   ```
6. Запустите фронтенд и бота:
   - Фронтенд: `npm run dev`
   - Бот:      `npm run bot`

---

## Переменные окружения (.env пример)
```env
# База данных
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/discordbot

# Discord OAuth (для NextAuth)
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_ADMIN_IDS=comma,separated,discord,ids
BOT_SECRET_KEY=your_secret_key

# Приложение
APP_URL=http://localhost:3000
NODE_ENV=development
POSTGRES_PORT=5432
```

---

## Миграции и сиды
- Применить миграции: `npx prisma migrate deploy`
- Заполнить тестовые данные: `npm run seed`
- Инициализировать ботов: `npm run init-bots`
- Очистить БД: `npm run clean`

---

## Запуск через Docker

1. Создайте `.env` (см. выше)
2. Запустите:
   ```bash
   docker-compose up --build
   ```
3. Приложение будет доступно на http://localhost (порт можно изменить в nginx.dev.conf)

---

## Команды Discord-бота

**Основные:**
- `!join` — Присоединиться к боту (обязательно для входа в веб)
- `!stat [id]` — Ваша или чужая статистика
- `!rank [id]` — Ваш или чужой ранг и соседи
- `!top` — Топ-10 игроков
- `!bottom` — Антитоп-10 игроков
- `!help` — Список команд

**Очереди (в каналах сбора):**
- `++` — Встать в очередь
- `--` — Покинуть очередь
- `+bot` — Добавить бота в очередь
- `-bot` — Убрать бота из очереди
- `clean` — Очистить очередь
- `help` — Список команд очереди

---

## Структура проекта

- `src/app` — Next.js frontend (страницы, API, стили)
- `src/bot` — Discord-бот (команды, обработчики, сервисы)
- `src/server` — tRPC, сервисы, роутеры
- `prisma/` — Prisma schema, миграции, сиды

---

## Как начать пользоваться
1. Войдите через Discord на сайте
2. Следуйте инструкции "Присоединиться к боту" (страница /join-bot)
3. Используйте команды бота в Discord для очередей и статистики 
4. Управляйте матчами и профилем через веб-интерфейс

---
