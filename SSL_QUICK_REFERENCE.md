# Быстрая справка по SSL для версии BOGDAN

## 🚀 Быстрая настройка SSL (первый раз)

### 1. Подготовка
```bash
# Проверить DNS
nslookup rocknrollracing.online

# Открыть порты
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 2. Установка Certbot
```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Получение сертификата
```bash
cd ~/projects/discord-bot-new

# Остановить nginx
docker compose -f docker-compose.prod.bogdan.yml stop nginx

# Получить сертификат
sudo certbot certonly --standalone \
  -d rocknrollracing.online \
  -d www.rocknrollracing.online \
  --email ваш_email@example.com \
  --agree-tos \
  --non-interactive

# Запустить nginx
docker compose -f docker-compose.prod.bogdan.yml start nginx
```

### 4. Проверка
```bash
# Проверить сертификат
sudo certbot certificates

# Проверить HTTPS
curl -I https://rocknrollracing.online
```

---

## ✅ Проверка SSL

### Быстрая проверка
```bash
# Использовать готовый скрипт
./check-ssl.sh

# Или вручную
sudo certbot certificates
```

### Детальная проверка
```bash
# Проверить срок действия
echo | openssl s_client -servername rocknrollracing.online -connect rocknrollracing.online:443 2>/dev/null | openssl x509 -noout -dates

# Проверить редирект HTTP -> HTTPS
curl -I http://rocknrollracing.online
# Должен вернуть: HTTP/1.1 301 Moved Permanently

# Онлайн проверка
# https://www.ssllabs.com/ssltest/analyze.html?d=rocknrollracing.online
```

---

## 🔄 Автоматическое обновление

### Настройка (один раз)

**Вариант 1: Systemd Timer (рекомендуется)**

1. Обновить путь в `renew-ssl.sh`:
```bash
nano renew-ssl.sh
# Изменить PROJECT_DIR на ваш путь
```

2. Создать systemd service:
```bash
sudo nano /etc/systemd/system/certbot-renew.service
```
```ini
[Unit]
Description=Certbot SSL Certificate Renewal
After=network.target docker.service

[Service]
Type=oneshot
ExecStart=/home/ваш_пользователь/projects/discord-bot-new/renew-ssl.sh
User=ваш_пользователь
```

3. Создать timer:
```bash
sudo nano /etc/systemd/system/certbot-renew.timer
```
```ini
[Unit]
Description=Certbot Renewal Timer
Requires=certbot-renew.service

[Timer]
OnCalendar=daily
RandomizedDelaySec=3600

[Install]
WantedBy=timers.target
```

4. Активировать:
```bash
sudo systemctl daemon-reload
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer
```

**Вариант 2: Cron**
```bash
chmod +x renew-ssl.sh
crontab -e
# Добавить:
0 3 * * * /home/ваш_пользователь/projects/discord-bot-new/renew-ssl.sh
```

### Проверка автоматического обновления
```bash
# Проверить статус timer
sudo systemctl status certbot-renew.timer

# Посмотреть когда следующий запуск
sudo systemctl list-timers | grep certbot

# Посмотреть логи
sudo journalctl -u certbot-renew.service -n 50
```

### Тест обновления
```bash
# Безопасный тест (dry-run)
sudo certbot renew --dry-run

# Принудительное обновление (для теста)
sudo certbot renew --force-renewal
docker compose -f docker-compose.prod.bogdan.yml restart nginx
```

---

## 🔧 Полезные команды

```bash
# Проверить сертификаты
sudo certbot certificates

# Обновить вручную
sudo certbot renew
docker compose -f docker-compose.prod.bogdan.yml restart nginx

# Проверить SSL соединение
openssl s_client -connect rocknrollracing.online:443 -servername rocknrollracing.online

# Проверить конфиг nginx
docker exec rnr_racing_nginx_bogdan nginx -t

# Перезагрузить nginx конфиг
docker exec rnr_racing_nginx_bogdan nginx -s reload
```

---

## ⚠️ Решение проблем

### Сертификат не получен
```bash
# Проверить DNS
nslookup rocknrollracing.online

# Проверить порт 80
sudo netstat -tuln | grep 80

# Проверить firewall
sudo ufw status
```

### Nginx не запускается
```bash
# Проверить логи
docker logs rnr_racing_nginx_bogdan

# Проверить конфиг
docker exec rnr_racing_nginx_bogdan nginx -t

# Проверить монтирование сертификатов
docker exec rnr_racing_nginx_bogdan ls -la /etc/letsencrypt/live/rocknrollracing.online/
```

### Сертификат истек
```bash
sudo certbot renew --force-renewal
docker compose -f docker-compose.prod.bogdan.yml restart nginx
```

---

Подробная инструкция: см. `SSL_SETUP_BOGDAN.md`

