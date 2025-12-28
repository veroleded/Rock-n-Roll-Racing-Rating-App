# Инструкция по развертыванию версии BOGDAN на production сервере

## Требования

- Сервер с Ubuntu/Debian (или другой Linux дистрибутив)
- Доступ по SSH
- Домен `rocknrollracing.online` должен указывать на IP сервера (A-запись в DNS)

---

## Шаг 1: Подготовка сервера

### 1.1 Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Установка Docker

```bash
# Установка зависимостей
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Добавление официального GPG ключа Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Добавление репозитория Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установка Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Проверка установки
sudo docker --version
sudo docker compose version
```

### 1.3 Настройка пользователя (опционально, но рекомендуется)

```bash
# Добавить текущего пользователя в группу docker (чтобы не использовать sudo)
sudo usermod -aG docker $USER
# Выйти и зайти снова, чтобы изменения вступили в силу
```

---

## Шаг 2: Клонирование проекта

```bash
# Перейти в домашнюю директорию или создать директорию для проектов
cd ~
mkdir -p projects
cd projects

# Клонировать репозиторий (замените на ваш URL)
git clone <ваш_repo_url> discord-bot-new
cd discord-bot-new

# Переключиться на нужную ветку (если нужно)
# git checkout main
```

---

## Шаг 3: Настройка переменных окружения

### 3.1 Создание файла .env.prod

```bash
cp .env .env.prod
nano .env.prod  # или используйте другой редактор
```

### 3.2 Настройка .env.prod для версии BOGDAN

Убедитесь, что в `.env.prod` установлены следующие значения:

```env
# Версия
VERSION=bogdan
NEXT_PUBLIC_VERSION=bogdan

# URL приложения (важно для bogdan версии!)
APP_URL=https://rocknrollracing.online
NEXTAUTH_URL=https://rocknrollracing.online

# База данных
DATABASE_URL="postgresql://veroled:veroled@postgres:5432/rnr_racing_db?schema=public"
POSTGRES_USER=veroled
POSTGRES_PASSWORD=veroled
POSTGRES_DB=rnr_racing_db
POSTGRES_PORT=5432

# Discord OAuth
DISCORD_CLIENT_ID=ваш_discord_client_id
DISCORD_CLIENT_SECRET=ваш_discord_client_secret
DISCORD_GUILD_ID=ваш_discord_guild_id
DISCORD_ADMIN_IDS="416988136447410177,375610327334780938"

# NextAuth
NEXTAUTH_SECRET=сгенерируйте_случайную_строку_минимум_32_символа

# Discord Bot
DISCORD_BOT_TOKEN=ваш_discord_bot_token
BOT_SECRET_KEY=сгенерируйте_случайную_строку_минимум_32_символа

# Redis
REDIS_URL=redis://redis:6379

# Окружение
NODE_ENV=production
```

**Важно:**

- Замените все значения на ваши реальные данные
- `NEXTAUTH_SECRET` и `BOT_SECRET_KEY` должны быть случайными строками (можно сгенерировать: `openssl rand -base64 32`)
- `DATABASE_URL` использует `postgres` как хост (имя сервиса в docker-compose), не `localhost`

---

## Шаг 4: Настройка DNS и SSL (рекомендуется)

### 4.1 Настройка DNS

Убедитесь, что домен `rocknrollracing.online` указывает на IP адрес вашего сервера:

- A-запись: `rocknrollracing.online` → `IP_вашего_сервера`
- A-запись: `www.rocknrollracing.online` → `IP_вашего_сервера`

### 4.2 Настройка SSL (HTTPS) - рекомендуется

Для production рекомендуется использовать HTTPS. Можно использовать:

- **Let's Encrypt (Certbot)** - бесплатный SSL сертификат
- **Cloudflare** - с автоматическим SSL

#### Вариант A: Certbot (Let's Encrypt)

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата (nginx должен быть остановлен)
sudo certbot certonly --standalone -d rocknrollracing.online -d www.rocknrollracing.online

# Сертификаты будут сохранены в:
# /etc/letsencrypt/live/rocknrollracing.online/fullchain.pem
# /etc/letsencrypt/live/rocknrollracing.online/privkey.pem
```

После получения сертификата нужно обновить `nginx.bogdan.conf` для использования HTTPS (см. ниже).

---

## Шаг 5: Настройка Nginx для HTTPS (если используете SSL)

Если вы получили SSL сертификат, обновите `nginx.bogdan.conf`:

```nginx
server {
    listen 80;
    server_name rocknrollracing.online www.rocknrollracing.online;

    # Редирект на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name rocknrollracing.online www.rocknrollracing.online;

    ssl_certificate /etc/letsencrypt/live/rocknrollracing.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rocknrollracing.online/privkey.pem;

    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /_next/static/ {
        proxy_pass http://app:3000/_next/static/;
        proxy_cache_valid 60m;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

И обновите `docker-compose.prod.bogdan.yml` для монтирования сертификатов:

```yaml
nginx:
  volumes:
    - ./nginx.bogdan.conf:/etc/nginx/conf.d/default.conf
    - /etc/letsencrypt:/etc/letsencrypt:ro # Добавить эту строку
```

---

## Шаг 6: Запуск приложения

### 6.1 Сборка и запуск

```bash
# Перейти в директорию проекта
cd /root/Rock-n-Roll-Racing-Rating-App

# Запустить в фоновом режиме
docker compose -f docker-compose.prod.bogdan.yml up -d --build
```

### 6.2 Проверка статуса

```bash
# Проверить статус контейнеров
docker compose -f docker-compose.prod.bogdan.yml ps

# Просмотр логов
docker compose -f docker-compose.prod.bogdan.yml logs -f

# Просмотр логов конкретного сервиса
docker compose -f docker-compose.prod.bogdan.yml logs -f app
docker compose -f docker-compose.prod.bogdan.yml logs -f nginx
```

### 6.3 Проверка работы

- Откройте в браузере: `http://rocknrollracing.online` (или `https://` если настроили SSL)
- Проверьте, что бот отвечает в Discord

---

## Шаг 7: Настройка автозапуска (опционально)

Docker Compose уже настроен на `restart: always`, но можно также настроить автозапуск на уровне системы:

```bash
# Создать systemd service (опционально)
sudo nano /etc/systemd/system/discord-bot-bogdan.service
```

Содержимое файла:

```ini
[Unit]
Description=Discord Bot Bogdan
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/root/Rock-n-Roll-Racing-Rating-App
ExecStart=/usr/bin/docker compose -f docker-compose.prod.bogdan.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.bogdan.yml down
User=root

[Install]
WantedBy=multi-user.target
```

Активация:

```bash
sudo systemctl enable discord-bot-bogdan.service
sudo systemctl start discord-bot-bogdan.service
```

---

## Полезные команды

### Остановка

```bash
docker compose -f docker-compose.prod.bogdan.yml down
```

### Перезапуск

```bash
docker compose -f docker-compose.prod.bogdan.yml restart
```

### Обновление кода

```bash
# Остановить
docker compose -f docker-compose.prod.bogdan.yml down

# Обновить код
git pull

# Пересобрать и запустить
docker compose -f docker-compose.prod.bogdan.yml up -d --build
```

### Просмотр логов

```bash
# Все сервисы
docker compose -f docker-compose.prod.bogdan.yml logs -f

# Конкретный сервис
docker compose -f docker-compose.prod.bogdan.yml logs -f app
docker compose -f docker-compose.prod.bogdan.yml logs -f nginx
docker compose -f docker-compose.prod.bogdan.yml logs -f postgres
```

### Вход в контейнер

```bash
docker exec -it rnr_racing_app_bogdan sh
```

### Проверка базы данных

```bash
docker exec -it rnr_racing_db_bogdan psql -U veroled -d rnr_racing_db
```

---

## Решение проблем

### Проблема: Контейнеры не запускаются

```bash
# Проверить логи
docker compose -f docker-compose.prod.bogdan.yml logs

# Проверить статус
docker compose -f docker-compose.prod.bogdan.yml ps
```

### Проблема: База данных не подключается

- Проверьте `DATABASE_URL` в `.env.prod` (должен использовать `postgres` как хост)
- Проверьте, что контейнер postgres запущен: `docker ps`

### Проблема: Домен не работает

- Проверьте DNS записи: `nslookup rocknrollracing.online`
- Проверьте, что порт 80 открыт в firewall
- Проверьте логи nginx: `docker logs rnr_racing_nginx_bogdan`

### Проблема: Бот не отвечает

- Проверьте `DISCORD_BOT_TOKEN` в `.env.prod`
- Проверьте логи бота: `docker logs rnr_racing_app_bogdan | grep bot`

---

## Firewall (если используется)

```bash
# Разрешить HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включить firewall
sudo ufw enable
```

---

## Резервное копирование

### База данных

```bash
# Создать бэкап
docker exec rnr_racing_db_bogdan pg_dump -U veroled rnr_racing_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановить из бэкапа
cat backup_YYYYMMDD_HHMMSS.sql | docker exec -i rnr_racing_db_bogdan psql -U veroled rnr_racing_db
```

---

## Мониторинг

### Использование ресурсов

```bash
docker stats
```

### Проверка места на диске

```bash
docker system df
```

---

## Важные замечания

1. **Безопасность**: Убедитесь, что `.env.prod` не попал в git (должен быть в `.gitignore`)
2. **SSL**: Для production обязательно используйте HTTPS
3. **Бэкапы**: Регулярно делайте бэкапы базы данных
4. **Обновления**: Регулярно обновляйте Docker образы и систему
5. **Логи**: Настройте ротацию логов, чтобы они не занимали много места
