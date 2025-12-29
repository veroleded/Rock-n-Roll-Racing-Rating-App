# Настройка fail2ban для автоматической блокировки

## Что такое fail2ban?

fail2ban — это инструмент для автоматической блокировки IP адресов, которые демонстрируют подозрительное поведение (множественные неудачные попытки, сканирование, атаки).

## Зачем это нужно?

После анализа логов Nginx обнаружены:
- WordPress сканеры (`/wp-admin/setup-config.php`)
- PHP/ASP сканеры (запросы к `.php`, `.asp` файлам)
- Множественные 404 ошибки с одного IP

fail2ban автоматически заблокирует такие IP адреса, что:
- Снизит нагрузку на сервер
- Уменьшит количество пакетов
- Защитит от будущих атак

## Установка

### Автоматическая установка (рекомендуется)

```bash
cd /root/Rock-n-Roll-Racing-Rating-App
sudo ./scripts/security/setup-fail2ban.sh
```

### Ручная установка

```bash
# Установка
sudo apt update
sudo apt install -y fail2ban

# Копирование конфигурации
sudo cp scripts/security/fail2ban/jail.local /etc/fail2ban/jail.local
sudo cp scripts/security/fail2ban/filter.d/* /etc/fail2ban/filter.d/

# Запуск
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Конфигурация для Docker

### Вариант 1: Монтирование логов на хост (рекомендуется)

Добавьте в `docker-compose.prod.bogdan.yml`:

```yaml
nginx:
  volumes:
    - ./nginx.bogdan.conf:/etc/nginx/conf.d/default.conf
    - /etc/letsencrypt:/etc/letsencrypt:ro
    - ./logs/nginx:/var/log/nginx  # Монтируем логи на хост
```

Затем обновите пути в `/etc/fail2ban/jail.local`:

```ini
[nginx-limit-req]
logpath = /root/Rock-n-Roll-Racing-Rating-App/logs/nginx/error.log

[nginx-404]
logpath = /root/Rock-n-Roll-Racing-Rating-App/logs/nginx/access.log

[nginx-bot]
logpath = /root/Rock-n-Roll-Racing-Rating-App/logs/nginx/access.log
```

### Вариант 2: Использование Docker логов

Если логи не монтируются, можно использовать `docker logs`:

```bash
# Создать скрипт для получения логов
sudo nano /usr/local/bin/nginx-access-log.sh
```

Содержимое:
```bash
#!/bin/bash
docker logs --since 1h rnr_racing_nginx_bogdan 2>&1 | grep -E "GET|POST|HEAD"
```

```bash
sudo chmod +x /usr/local/bin/nginx-access-log.sh
```

Затем в `/etc/fail2ban/jail.local`:
```ini
[nginx-404]
logpath = /usr/local/bin/nginx-access-log.sh
```

## Настроенные jail

### 1. nginx-limit-req
- **Назначение**: Блокировка IP при превышении rate limit
- **Триггер**: Ошибки "limiting requests" в error.log
- **Параметры**: 5 попыток за 5 минут → бан на 30 минут

### 2. nginx-404
- **Назначение**: Блокировка WordPress/PHP сканеров
- **Триггер**: 404 ошибки на подозрительные пути (`/wp-admin`, `.php`, `/admin`)
- **Параметры**: 5 попыток за 10 минут → бан на 1 час

### 3. nginx-bot
- **Назначение**: Блокировка ботов (множественные 404/403)
- **Триггер**: 10 ошибок 404/403 за 5 минут
- **Параметры**: 10 попыток за 5 минут → бан на 2 часа

## Управление

### Проверка статуса

```bash
# Статус всех jail
sudo fail2ban-client status

# Статус конкретного jail
sudo fail2ban-client status nginx-404

# Детальная информация
sudo fail2ban-client status nginx-404
```

### Просмотр заблокированных IP

```bash
# Все заблокированные IP в jail
sudo fail2ban-client status nginx-404 | grep "Banned IP list"

# Или через iptables
sudo iptables -L -n | grep REJECT
```

### Разблокировка IP

```bash
# Разблокировать конкретный IP
sudo fail2ban-client set nginx-404 unbanip 1.2.3.4

# Разблокировать все IP в jail
sudo fail2ban-client unban --all
```

### Ручная блокировка IP

```bash
# Заблокировать IP вручную
sudo fail2ban-client set nginx-404 banip 1.2.3.4
```

## Мониторинг

### Просмотр логов

```bash
# Логи fail2ban
sudo tail -f /var/log/fail2ban.log

# Поиск заблокированных IP
sudo grep "Ban" /var/log/fail2ban.log | tail -20

# Статистика блокировок
sudo grep "Ban" /var/log/fail2ban.log | wc -l
```

### Интеграция с мониторингом

Можно добавить проверку в скрипт мониторинга:

```bash
# Количество заблокированных IP
BLOCKED_COUNT=$(sudo fail2ban-client status nginx-404 | grep "Currently banned" | awk '{print $NF}')
echo "Заблокировано IP: $BLOCKED_COUNT"
```

## Настройка параметров

### Изменение времени бана

Отредактируйте `/etc/fail2ban/jail.local`:

```ini
[nginx-404]
bantime = 7200  # 2 часа вместо 1 часа
```

### Изменение количества попыток

```ini
[nginx-404]
maxretry = 3  # Блокировать после 3 попыток вместо 5
findtime = 300  # Окно времени: 5 минут вместо 10
```

### Игнорирование IP

Добавьте в `[DEFAULT]` секцию:

```ini
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1 172.17.0.0/16 YOUR_IP_HERE
```

## Устранение проблем

### fail2ban не запускается

```bash
# Проверить логи
sudo journalctl -u fail2ban -n 50

# Проверить конфигурацию
sudo fail2ban-client -t

# Перезапустить
sudo systemctl restart fail2ban
```

### IP не блокируется

1. Проверьте, что логи доступны:
   ```bash
   sudo tail -f /var/log/nginx/access.log
   ```

2. Проверьте, что фильтр работает:
   ```bash
   sudo fail2ban-regex /var/log/nginx/access.log /etc/fail2ban/filter.d/nginx-404.conf
   ```

3. Проверьте, что jail активен:
   ```bash
   sudo fail2ban-client status nginx-404
   ```

### Слишком много блокировок

Увеличьте `maxretry` или `findtime` в конфигурации jail.

### Нужно разблокировать свой IP

```bash
# Временно разблокировать
sudo fail2ban-client set nginx-404 unbanip YOUR_IP

# Добавить в ignoreip
sudo nano /etc/fail2ban/jail.local
# Добавьте IP в ignoreip = ...
```

## Интеграция с Nginx блокировками

fail2ban работает **дополнительно** к блокировкам в Nginx:

1. **Nginx блокирует** запросы сразу (возвращает 444)
2. **fail2ban анализирует** логи и блокирует IP на уровне firewall

Это создает двойную защиту:
- Nginx блокирует запросы мгновенно
- fail2ban блокирует IP на уровне системы

## Рекомендации

1. **Мониторьте логи** регулярно:
   ```bash
   sudo tail -f /var/log/fail2ban.log
   ```

2. **Проверяйте статистику** раз в неделю:
   ```bash
   sudo fail2ban-client status
   ```

3. **Настройте уведомления** (если нужно):
   - Раскомментируйте `destemail` в `/etc/fail2ban/jail.local`
   - Установите `sendmail` или настройте SMTP

4. **Регулярно обновляйте** fail2ban:
   ```bash
   sudo apt update && sudo apt upgrade fail2ban
   ```

## Дополнительные ресурсы

- [Официальная документация fail2ban](https://www.fail2ban.org/wiki/index.php/Main_Page)
- [Примеры фильтров](https://github.com/fail2ban/fail2ban/tree/master/config/filter.d)
- [Настройка для Docker](https://www.fail2ban.org/wiki/index.php/Docker)

