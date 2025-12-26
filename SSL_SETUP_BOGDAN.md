# Подробная инструкция по настройке SSL для версии BOGDAN

## Что такое SSL и зачем он нужен?

SSL (HTTPS) обеспечивает:

- **Шифрование данных** между браузером и сервером
- **Безопасность** передачи паролей и личных данных
- **Доверие пользователей** (зеленый замочек в браузере)
- **SEO преимущества** (Google предпочитает HTTPS сайты)

---

## Шаг 1: Подготовка

### 1.1 Проверка DNS

Перед получением SSL сертификата убедитесь, что домен правильно настроен:

```bash
# Проверить A-запись домена
nslookup rocknrollracing.online
nslookup www.rocknrollracing.online

# Должен вернуться IP адрес вашего сервера
```

**Важно:** DNS записи должны быть настроены **до** получения сертификата!

### 1.2 Проверка доступности домена

```bash
# Проверить, что порт 80 открыт
curl -I http://rocknrollracing.online

# Или с другого компьютера
ping rocknrollracing.online
```

### 1.3 Открытие портов в firewall

```bash
# Проверить статус firewall
sudo ufw status

# Разрешить HTTP (80) и HTTPS (443)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Если firewall не включен, можно включить
sudo ufw enable
```

---

## Шаг 2: Получение SSL сертификата (Let's Encrypt)

### 2.1 Установка Certbot

```bash
# Обновление пакетов
sudo apt update

# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Проверка установки
certbot --version
```

### 2.2 Получение сертификата (Standalone режим)

**Важно:** Для получения сертификата нужно временно освободить порт 80, так как Certbot будет использовать его для проверки домена.

#### Шаг 1: Проверка, что занимает порт 80

```bash
# Проверить, что занимает порт 80
sudo lsof -i :80
# или
sudo netstat -tulpn | grep :80
# или
sudo ss -tulpn | grep :80
```

#### Шаг 2: Остановка сервиса, занимающего порт 80

**Вариант A: Если порт занят Docker контейнером nginx**

```bash
# Перейти в директорию проекта (если проект уже склонирован)
cd ~/projects/discord-bot-new

# Остановить nginx контейнер
docker compose -f docker-compose.prod.bogdan.yml stop nginx

# Или если контейнеры запущены через другой docker-compose файл
docker ps | grep nginx
docker stop <container_id>
```

**Вариант B: Если порт занят системным nginx**

```bash
# Проверить статус системного nginx
sudo systemctl status nginx

# Остановить системный nginx
sudo systemctl stop nginx

# Или если используется другой веб-сервер
sudo systemctl stop apache2  # для Apache
```

**Вариант C: Если проект еще не запущен (рекомендуется для первого раза)**

Если вы еще не запускали проект, то порт 80 может быть занят системным nginx или другим сервисом. Остановите его:

```bash
# Проверить все сервисы, использующие порт 80
sudo lsof -i :80

# Остановить системный nginx (если установлен)
sudo systemctl stop nginx
sudo systemctl disable nginx  # отключить автозапуск (опционально)

# Или остановить Apache (если установлен)
sudo systemctl stop apache2
```

#### Шаг 3: Получение сертификата

```bash
# Перейти в директорию проекта (если проект уже склонирован)
cd ~/projects/discord-bot-new

# Получить сертификат
sudo certbot certonly --standalone \
  -d rocknrollracing.online \
  -d www.rocknrollracing.online \
  --email bogdan.teterev@gmail.com \
  --agree-tos \
  --non-interactive
```

#### Шаг 4: Проверка полученного сертификата

```bash
# Проверить, что сертификат получен
sudo certbot certificates

# Проверить файлы сертификата
sudo ls -la /etc/letsencrypt/live/rocknrollracing.online/
```

**Важно:** После получения сертификата вы можете запустить проект. Если вы остановили системный nginx, его можно оставить остановленным - проект будет использовать свой nginx контейнер.

**Что происходит:**

- Certbot временно запускает веб-сервер на порту 80
- Let's Encrypt проверяет, что домен указывает на ваш сервер
- Сертификат сохраняется в `/etc/letsencrypt/live/rocknrollracing.online/`

### 2.3 Проверка полученных сертификатов

```bash
# Проверить наличие сертификатов
sudo ls -la /etc/letsencrypt/live/rocknrollracing.online/

# Должны быть файлы:
# - cert.pem (сертификат)
# - chain.pem (промежуточный сертификат)
# - fullchain.pem (полная цепочка: cert + chain)
# - privkey.pem (приватный ключ)

# Проверить срок действия сертификата
sudo certbot certificates
```

---

## Шаг 3: Настройка Nginx для HTTPS

### 3.1 Обновление nginx.bogdan.conf

Создайте новый конфиг с поддержкой HTTPS:

```bash
nano nginx.bogdan.conf
```

Замените содержимое на:

```nginx
# Редирект HTTP на HTTPS
server {
    listen 80;
    server_name rocknrollracing.online www.rocknrollracing.online;

    # Редирект всех HTTP запросов на HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS сервер
server {
    listen 443 ssl http2;
    server_name rocknrollracing.online www.rocknrollracing.online;

    # SSL сертификаты
    ssl_certificate /etc/letsencrypt/live/rocknrollracing.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rocknrollracing.online/privkey.pem;

    # SSL настройки безопасности
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    # OCSP Stapling для улучшения производительности
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/rocknrollracing.online/chain.pem;

    # Безопасные заголовки
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Проксирование на приложение
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

    # Кэширование статических файлов
    location /_next/static/ {
        proxy_pass http://app:3000/_next/static/;
        proxy_cache_valid 60m;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

### 3.2 Обновление docker-compose.prod.bogdan.yml

Добавьте монтирование сертификатов в секцию nginx:

```yaml
nginx:
  image: nginx:alpine
  container_name: rnr_racing_nginx_bogdan
  ports:
    - '80:80'
    - '443:443' # Добавить порт для HTTPS
  volumes:
    - ./nginx.bogdan.conf:/etc/nginx/conf.d/default.conf
    - /etc/letsencrypt:/etc/letsencrypt:ro # Монтирование сертификатов (read-only)
  depends_on:
    - app
  networks:
    - app_network
  restart: always
```

### 3.3 Перезапуск контейнеров

```bash
# Перезапустить nginx с новыми настройками
docker compose -f docker-compose.prod.bogdan.yml restart nginx

# Или перезапустить всё
docker compose -f docker-compose.prod.bogdan.yml down
docker compose -f docker-compose.prod.bogdan.yml up -d
```

---

## Шаг 4: Проверка SSL

### 4.1 Проверка в браузере

1. Откройте `https://rocknrollracing.online`
2. Должен появиться зеленый замочек 🔒
3. Нажмите на замочек → "Сертификат" → проверьте информацию

### 4.2 Проверка через командную строку

```bash
# Проверка SSL соединения
openssl s_client -connect rocknrollracing.online:443 -servername rocknrollracing.online

# Проверка срока действия сертификата
echo | openssl s_client -servername rocknrollracing.online -connect rocknrollracing.online:443 2>/dev/null | openssl x509 -noout -dates

# Проверка через curl
curl -I https://rocknrollracing.online
```

### 4.3 Онлайн проверка SSL

Используйте онлайн инструменты:

- **SSL Labs**: https://www.ssllabs.com/ssltest/analyze.html?d=rocknrollracing.online
- **SSL Checker**: https://www.sslshopper.com/ssl-checker.html#hostname=rocknrollracing.online

Ожидаемый результат: **A** или **A+** рейтинг.

### 4.4 Проверка редиректа HTTP → HTTPS

```bash
# Должен вернуть 301 редирект на HTTPS
curl -I http://rocknrollracing.online

# Должен вернуть 200 OK с HTTPS
curl -I https://rocknrollracing.online
```

---

## Шаг 5: Автоматическое обновление сертификата

### 5.1 Настройка автоматического обновления

Let's Encrypt сертификаты действительны **90 дней**. Certbot может автоматически обновлять их.

#### Вариант A: Systemd Timer (рекомендуется)

**Шаг 1:** Обновите путь в скрипте `renew-ssl.sh`:

```bash
cd ~/projects/discord-bot-new
nano renew-ssl.sh
# Измените PROJECT_DIR на ваш реальный путь, например:
# PROJECT_DIR="/home/ubuntu/projects/discord-bot-new"
```

**Шаг 2:** Сделайте скрипт исполняемым:

```bash
chmod +x renew-ssl.sh
```

**Шаг 3:** Создайте systemd service файл:

```bash
sudo nano /etc/systemd/system/certbot-renew.service
```

Содержимое (замените путь на ваш реальный):

```ini
[Unit]
Description=Certbot SSL Certificate Renewal
After=network.target docker.service

[Service]
Type=oneshot
ExecStart=/home/ваш_пользователь/projects/discord-bot-new/renew-ssl.sh
User=ваш_пользователь
StandardOutput=journal
StandardError=journal
```

**Шаг 4:** Создайте timer файл:

```bash
sudo nano /etc/systemd/system/certbot-renew.timer
```

Содержимое:

```ini
[Unit]
Description=Certbot Renewal Timer
Requires=certbot-renew.service

[Timer]
OnCalendar=daily
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
```

**Шаг 5:** Активация:

```bash
# Перезагрузить systemd
sudo systemctl daemon-reload

# Включить timer
sudo systemctl enable certbot-renew.timer

# Запустить timer
sudo systemctl start certbot-renew.timer

# Проверить статус
sudo systemctl status certbot-renew.timer
sudo systemctl list-timers | grep certbot
```

**Проверка работы:**

```bash
# Посмотреть когда следующий запуск
sudo systemctl list-timers certbot-renew.timer

# Посмотреть логи
sudo journalctl -u certbot-renew.service -n 50
```

#### Вариант B: Cron (альтернатива)

```bash
# Открыть crontab
crontab -e

# Добавить строку (проверка каждый день в 3:00 утра)
# Замените путь на ваш реальный путь к проекту
0 3 * * * /home/ваш_пользователь/projects/discord-bot-new/renew-ssl.sh >> /var/log/certbot-renew.log 2>&1
```

**Или используйте готовый скрипт:**

```bash
# Сделать скрипт исполняемым
chmod +x renew-ssl.sh

# Добавить в crontab
crontab -e
# Добавить:
0 3 * * * /home/ваш_пользователь/projects/discord-bot-new/renew-ssl.sh
```

### 5.2 Тестирование обновления

```bash
# Проверить, нужно ли обновление (dry-run)
sudo certbot renew --dry-run

# Если всё работает, можно принудительно обновить (для теста)
sudo certbot renew --force-renewal

# Перезапустить nginx после обновления
cd ~/projects/discord-bot-new
docker compose -f docker-compose.prod.bogdan.yml restart nginx
```

### 5.3 Проверка автоматического обновления

```bash
# Проверить, когда сертификат истекает
sudo certbot certificates

# Проверить логи обновления
sudo journalctl -u certbot-renew.service -n 50
# или
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

---

## Шаг 6: Обновление .env.prod для HTTPS

Убедитесь, что в `.env.prod` используются HTTPS URL:

```env
APP_URL=https://rocknrollracing.online
NEXTAUTH_URL=https://rocknrollracing.online
```

После изменения перезапустите приложение:

```bash
docker compose -f docker-compose.prod.bogdan.yml restart app
```

---

## Решение проблем

### Проблема: "Failed to obtain certificate"

**Причины:**

- DNS не настроен правильно
- Порт 80 закрыт в firewall
- Домен не указывает на ваш сервер

**Решение:**

```bash
# Проверить DNS
nslookup rocknrollracing.online

# Проверить firewall
sudo ufw status

# Проверить доступность порта 80
sudo netstat -tuln | grep 80
```

### Проблема: "nginx: [emerg] SSL_CTX_use_certificate"

**Причина:** Неправильные пути к сертификатам или они недоступны в контейнере.

**Решение:**

```bash
# Проверить, что сертификаты существуют
sudo ls -la /etc/letsencrypt/live/rocknrollracing.online/

# Проверить, что они монтируются в контейнер
docker exec rnr_racing_nginx_bogdan ls -la /etc/letsencrypt/live/rocknrollracing.online/
```

### Проблема: "Certificate has expired"

**Решение:**

```bash
# Обновить сертификат вручную
sudo certbot renew --force-renewal

# Перезапустить nginx
docker compose -f docker-compose.prod.bogdan.yml restart nginx
```

### Проблема: Редирект не работает

**Решение:**

```bash
# Проверить конфиг nginx
docker exec rnr_racing_nginx_bogdan nginx -t

# Перезагрузить конфиг
docker exec rnr_racing_nginx_bogdan nginx -s reload
```

---

## Дополнительные настройки безопасности

### HSTS (HTTP Strict Transport Security)

Уже добавлен в конфиг:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Security Headers

Добавлены в конфиг:

- `X-Frame-Options` - защита от clickjacking
- `X-Content-Type-Options` - защита от MIME sniffing
- `X-XSS-Protection` - защита от XSS

---

## Мониторинг сертификата

### Скрипт для проверки срока действия

Создайте скрипт `check-ssl.sh`:

```bash
#!/bin/bash
DOMAIN="rocknrollracing.online"
DAYS_LEFT=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2 | xargs -I {} date -d {} +%s)
CURRENT_DATE=$(date +%s)
DAYS=$(( ($DAYS_LEFT - $CURRENT_DATE) / 86400 ))

if [ $DAYS -lt 30 ]; then
    echo "⚠️  ВНИМАНИЕ: Сертификат истекает через $DAYS дней!"
    echo "Запустите: sudo certbot renew"
else
    echo "✅ Сертификат действителен еще $DAYS дней"
fi
```

Сделать исполняемым:

```bash
chmod +x check-ssl.sh
./check-ssl.sh
```

---

## Резюме команд

### Основные команды

```bash
# Получение сертификата (первый раз)
docker compose -f docker-compose.prod.bogdan.yml stop nginx
sudo certbot certonly --standalone -d rocknrollracing.online -d www.rocknrollracing.online --email ваш_email@example.com --agree-tos --non-interactive
docker compose -f docker-compose.prod.bogdan.yml start nginx

# Проверка сертификатов
sudo certbot certificates

# Обновление вручную
sudo certbot renew

# Тест обновления (безопасный тест)
sudo certbot renew --dry-run

# Принудительное обновление (для теста)
sudo certbot renew --force-renewal
docker compose -f docker-compose.prod.bogdan.yml restart nginx

# Проверка SSL соединения
openssl s_client -connect rocknrollracing.online:443 -servername rocknrollracing.online

# Проверка срока действия
echo | openssl s_client -servername rocknrollracing.online -connect rocknrollracing.online:443 2>/dev/null | openssl x509 -noout -dates

# Использование готового скрипта проверки
./check-ssl.sh
```

### Проверка работы

```bash
# Проверить HTTPS в браузере
# Откройте: https://rocknrollracing.online

# Проверить редирект HTTP -> HTTPS
curl -I http://rocknrollracing.online
# Должен вернуть: HTTP/1.1 301 Moved Permanently

# Проверить HTTPS
curl -I https://rocknrollracing.online
# Должен вернуть: HTTP/2 200

# Онлайн проверка SSL
# https://www.ssllabs.com/ssltest/analyze.html?d=rocknrollracing.online
```

---

## Чеклист

- [ ] DNS настроен и указывает на сервер
- [ ] Порт 80 и 443 открыты в firewall
- [ ] Certbot установлен
- [ ] Сертификат получен
- [ ] nginx.bogdan.conf обновлен для HTTPS
- [ ] docker-compose.prod.bogdan.yml обновлен (монтирование сертификатов)
- [ ] Контейнеры перезапущены
- [ ] HTTPS работает в браузере
- [ ] HTTP редиректит на HTTPS
- [ ] Автоматическое обновление настроено
- [ ] .env.prod обновлен с HTTPS URL

---

**Готово!** Теперь ваш сайт работает по HTTPS с автоматическим обновлением сертификата.
