# Блокировка ботов и сканеров

## Проблема

В логах Nginx обнаружены запросы от ботов и сканеров:

- WordPress сканеры (`/wp-admin/setup-config.php`, `/wordpress/wp-admin/setup-config.php`)
- Подозрительные IP адреса (Cloudflare IP, китайские IP)
- Запросы к несуществующим PHP файлам

Эти боты генерируют огромное количество запросов, что приводит к блокировке сервера.

## Что было сделано

### 1. Блокировка WordPress путей ✅

В `nginx.bogdan.conf` добавлена блокировка всех запросов к WordPress:

```nginx
location ~* ^/(wp-admin|wp-content|wp-includes|wordpress|wp-login|xmlrpc\.php) {
    deny all;
    return 444; # Закрываем соединение без ответа
}
```

### 2. Блокировка PHP/ASP файлов ✅

Блокируются все запросы к `.php`, `.asp`, `.aspx`, `.jsp` файлам, кроме нашего API:

```nginx
location ~* \.(php|asp|aspx|jsp|cgi)$ {
    if ($request_uri !~ ^/api/) {
        deny all;
        return 444;
    }
}
```

### 3. Блокировка админ панелей ✅

Блокируются запросы к известным путям админ панелей:

```nginx
location ~* ^/(admin|administrator|phpmyadmin|mysql|sql|database|db|backup|backups|old|test|tmp|temp|install|setup|config|configuration) {
    deny all;
    return 444;
}
```

### 4. Усиленный rate limiting для корневого пути ✅

Корневой путь `/` теперь имеет более строгий rate limiting (5 запросов/сек вместо 30).

### 5. Скрипт анализа атак ✅

Создан `scripts/analysis/analyze-nginx-attacks.sh` для анализа подозрительных запросов.

## Использование

### Анализ логов на сервере

```bash
# Анализ последнего дня
./scripts/analysis/analyze-nginx-attacks.sh

# Анализ последних 7 дней
./scripts/analysis/analyze-nginx-attacks.sh 7

# Анализ логов из Docker контейнера
docker logs --since 1d rnr_racing_nginx_bogdan > /tmp/nginx.log
./scripts/analysis/analyze-nginx-attacks.sh 1 /tmp/nginx.log
```

### Проверка текущих запросов

```bash
# Топ IP адресов
sudo awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -20

# Топ путей
sudo awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -20

# Подозрительные запросы
sudo grep -E "(wp-admin|\.php|admin|phpmyadmin)" /var/log/nginx/access.log | tail -50
```

## Обновление на сервере

После обновления конфигурации Nginx:

```bash
cd /root/Rock-n-Roll-Racing-Rating-App

# Сделать backup
cp nginx.bogdan.conf nginx.bogdan.conf.backup

# Обновить из репозитория
git pull

# Проверить конфигурацию
docker exec rnr_racing_nginx_bogdan nginx -t

# Перезапустить Nginx
docker-compose -f docker-compose.prod.bogdan.yml restart nginx

# Проверить логи
docker-compose -f docker-compose.prod.bogdan.yml logs nginx | tail -20
```

## Дополнительные меры защиты

### 1. Fail2ban (рекомендуется)

Установите fail2ban для автоматической блокировки подозрительных IP:

```bash
sudo apt update && sudo apt install -y fail2ban

# Создать конфигурацию для Nginx
sudo nano /etc/fail2ban/jail.local
```

Добавить:

```ini
[nginx-limit-req]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
findtime = 600
bantime = 3600
```

### 2. Cloudflare (опционально)

Если используете Cloudflare, включите:

- Bot Fight Mode
- Rate Limiting
- WAF (Web Application Firewall)

### 3. Мониторинг

Регулярно проверяйте логи:

```bash
# Ежедневно
./scripts/analysis/analyze-nginx-attacks.sh

# При подозрении на атаку
docker logs --since 1h rnr_racing_nginx_bogdan | grep -E "(wp-admin|\.php|admin)"
```

## Проверка эффективности

После применения блокировок проверьте:

1. **Количество заблокированных запросов**:

   ```bash
   sudo grep "444" /var/log/nginx/access.log | wc -l
   ```

2. **Снижение подозрительных запросов**:

   ```bash
   ./scripts/analysis/analyze-nginx-attacks.sh
   ```

3. **Трафик должен снизиться**:
   ```bash
   ./scripts/monitoring/monitor-traffic.sh
   ```

## Важно

- Блокировки применяются **до** проксирования на приложение, что экономит ресурсы
- Возврат `444` закрывает соединение без ответа, что экономит трафик
- `access_log off` для заблокированных запросов экономит место на диске
- Rate limiting все еще активен для легитимных запросов
