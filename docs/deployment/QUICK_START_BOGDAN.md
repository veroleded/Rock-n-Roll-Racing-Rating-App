# Быстрый старт для версии BOGDAN

## Минимальные шаги для первого запуска

### 1. Установка Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Выйти и зайти снова
```

### 2. Клонирование проекта
```bash
cd /root
git clone <ваш_repo_url> Rock-n-Roll-Racing-Rating-App
cd Rock-n-Roll-Racing-Rating-App
```

### 3. Создание .env.prod
```bash
cp .env .env.prod
nano .env.prod
```

**Обязательно измените в .env.prod:**
```env
VERSION=bogdan
NEXT_PUBLIC_VERSION=bogdan
APP_URL=https://rocknrollracing.online
NEXTAUTH_URL=https://rocknrollracing.online
DATABASE_URL="postgresql://veroled:veroled@postgres:5432/rnr_racing_db?schema=public"
NODE_ENV=production
REDIS_URL=redis://redis:6379
```

**Важно:** `DATABASE_URL` должен использовать `postgres` как хост (не `localhost`), так как это имя сервиса в docker-compose.

### 4. Настройка DNS
Убедитесь, что домен `rocknrollracing.online` указывает на IP вашего сервера (A-запись в DNS).

### 5. Запуск
```bash
docker compose -f docker-compose.prod.bogdan.yml up -d --build
```

### 6. Проверка
```bash
# Статус
docker compose -f docker-compose.prod.bogdan.yml ps

# Логи
docker compose -f docker-compose.prod.bogdan.yml logs -f
```

Откройте в браузере: `http://rocknrollracing.online`

---

## Основные команды

```bash
# Запуск
docker compose -f docker-compose.prod.bogdan.yml up -d

# Остановка
docker compose -f docker-compose.prod.bogdan.yml down

# Перезапуск
docker compose -f docker-compose.prod.bogdan.yml restart

# Логи
docker compose -f docker-compose.prod.bogdan.yml logs -f

# Обновление (после git pull)
docker compose -f docker-compose.prod.bogdan.yml down
docker compose -f docker-compose.prod.bogdan.yml up -d --build
```

---

## Настройка HTTPS (рекомендуется)

```bash
# Установка Certbot
sudo apt install -y certbot

# Получение сертификата (nginx должен быть остановлен)
sudo docker compose -f docker-compose.prod.bogdan.yml stop nginx
sudo certbot certonly --standalone -d rocknrollracing.online -d www.rocknrollracing.online
sudo docker compose -f docker-compose.prod.bogdan.yml start nginx

# Обновить nginx.bogdan.conf для HTTPS (см. DEPLOYMENT_BOGDAN.md)
# Добавить в docker-compose.prod.bogdan.yml монтирование сертификатов
```

---

Подробная инструкция: см. `DEPLOYMENT_BOGDAN.md`

