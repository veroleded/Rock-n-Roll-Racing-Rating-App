# Автоматическое обновление SSL сертификатов

## Быстрая настройка (5 минут)

### Шаг 1: Обновить скрипт обновления

```bash
cd /root/Rock-n-Roll-Racing-Rating-App

# Открыть скрипт для редактирования
nano scripts/ssl/renew-ssl.sh
```

Измените строку с `PROJECT_DIR` на ваш реальный путь:

```bash
PROJECT_DIR="/root/Rock-n-Roll-Racing-Rating-App"
```

Например, если ваш пользователь `ubuntu`:

```bash
PROJECT_DIR="/root/Rock-n-Roll-Racing-Rating-App"
```

**Как узнать путь?**

```bash
pwd
# Выведет текущий путь, например: /root/Rock-n-Roll-Racing-Rating-App
```

### Шаг 2: Сделать скрипт исполняемым

```bash
chmod +x scripts/ssl/renew-ssl.sh
```

### Шаг 3: Протестировать скрипт вручную

```bash
# Тест обновления (безопасный, не обновляет реально)
sudo certbot renew --dry-run

# Если тест прошел успешно, можно запустить скрипт вручную
sudo ./scripts/ssl/renew-ssl.sh
```

### Шаг 4: Настроить автоматический запуск

Выберите один из вариантов:

---

## Вариант A: Systemd Timer (рекомендуется)

### 4.1 Создать systemd service

```bash
sudo nano /etc/systemd/system/certbot-renew.service
```

Вставьте следующее содержимое (замените пути на ваши):

```ini
[Unit]
Description=Certbot SSL Certificate Renewal for rocknrollracing.online
After=network.target docker.service
Requires=docker.service

[Service]
Type=oneshot
# Путь к проекту: /root/Rock-n-Roll-Racing-Rating-App
ExecStart=/root/Rock-n-Roll-Racing-Rating-App/scripts/ssl/renew-ssl.sh
# Пользователь root
User=root
Group=root

# Логирование
StandardOutput=journal
StandardError=journal

# Переменные окружения
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
```

**Как узнать имя пользователя?**

```bash
whoami
# Выведет, например: ubuntu
```

### 4.2 Создать systemd timer

```bash
sudo nano /etc/systemd/system/certbot-renew.timer
```

Вставьте следующее содержимое:

```ini
[Unit]
Description=Certbot Renewal Timer
Requires=certbot-renew.service

[Timer]
# Запуск каждый день в случайное время между 00:00 и 01:00
OnCalendar=daily
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
```

### 4.3 Активировать timer

```bash
# Перезагрузить systemd
sudo systemctl daemon-reload

# Включить автозапуск timer
sudo systemctl enable certbot-renew.timer

# Запустить timer
sudo systemctl start certbot-renew.timer

# Проверить статус
sudo systemctl status certbot-renew.timer
```

### 4.4 Проверить работу

```bash
# Посмотреть список всех timers
sudo systemctl list-timers

# Посмотреть когда следующий запуск
sudo systemctl list-timers certbot-renew.timer

# Посмотреть логи (если уже был запуск)
sudo journalctl -u certbot-renew.service -n 50

# Посмотреть логи в реальном времени
sudo journalctl -u certbot-renew.service -f
```

---

## Вариант B: Cron (альтернатива)

Если вы предпочитаете использовать cron вместо systemd:

```bash
# Открыть crontab
crontab -e

# Добавить следующую строку (проверка каждый день в 3:00 утра)
# Замените путь на ваш реальный путь к проекту
0 3 * * * /root/Rock-n-Roll-Racing-Rating-App/scripts/ssl/renew-ssl.sh >> /var/log/certbot-renew.log 2>&1
```

Или с более подробным логированием:

```bash
0 3 * * * /root/Rock-n-Roll-Racing-Rating-App/scripts/ssl/renew-ssl.sh >> /var/log/certbot-renew.log 2>&1
```

**Проверка cron:**

```bash
# Посмотреть текущие задачи cron
crontab -l

# Проверить логи cron (если доступны)
sudo tail -f /var/log/syslog | grep CRON
```

---

## Проверка работы автоматического обновления

### Проверить статус сертификата

```bash
# Посмотреть информацию о сертификате
sudo certbot certificates

# Использовать готовый скрипт проверки
./scripts/ssl/check-ssl.sh
```

### Тест обновления (dry-run)

```bash
# Безопасный тест без реального обновления
sudo certbot renew --dry-run
```

Если тест прошел успешно, автоматическое обновление будет работать.

### Принудительное обновление (для теста)

```bash
# Принудительно обновить сертификат (даже если он еще действителен)
sudo certbot renew --force-renewal

# Перезапустить nginx
cd /root/Rock-n-Roll-Racing-Rating-App
docker compose -f docker-compose.prod.bogdan.yml restart nginx
```

---

## Мониторинг и логи

### Systemd Timer логи

```bash
# Посмотреть последние логи
sudo journalctl -u certbot-renew.service -n 50

# Посмотреть логи за последний час
sudo journalctl -u certbot-renew.service --since "1 hour ago"

# Посмотреть логи в реальном времени
sudo journalctl -u certbot-renew.service -f

# Посмотреть логи timer
sudo journalctl -u certbot-renew.timer -n 50
```

### Certbot логи

```bash
# Логи Certbot
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Посмотреть последние записи
sudo tail -n 100 /var/log/letsencrypt/letsencrypt.log
```

### Проверка статуса timer

```bash
# Статус timer
sudo systemctl status certbot-renew.timer

# Список всех timers
sudo systemctl list-timers

# Список только certbot timer
sudo systemctl list-timers | grep certbot
```

---

## Решение проблем

### Timer не запускается

```bash
# Проверить статус
sudo systemctl status certbot-renew.timer

# Проверить, что timer включен
sudo systemctl is-enabled certbot-renew.timer

# Перезапустить timer
sudo systemctl restart certbot-renew.timer
```

### Скрипт не выполняется

```bash
# Проверить права на выполнение
ls -l scripts/ssl/renew-ssl.sh

# Должно быть: -rwxr-xr-x (x означает исполняемый)

# Если нет прав, добавить:
chmod +x scripts/ssl/renew-ssl.sh

# Проверить, что путь правильный
cat scripts/ssl/renew-ssl.sh | grep PROJECT_DIR
```

### Ошибка "docker compose: command not found"

Если используется старая версия Docker Compose (без дефиса):

```bash
# Открыть скрипт
nano scripts/ssl/renew-ssl.sh

# Заменить
docker compose -f "$COMPOSE_FILE" restart nginx

# На
docker-compose -f "$COMPOSE_FILE" restart nginx
```

### Ошибка доступа к Docker

Если скрипт запускается от пользователя без прав на Docker:

```bash
# Добавить пользователя в группу docker
sudo usermod -aG docker $USER

# Выйти и зайти снова, или выполнить:
newgrp docker

# Проверить права
docker ps
```

---

## Часто задаваемые вопросы

### Как часто обновляется сертификат?

- **Let's Encrypt сертификаты** действительны 90 дней
- **Автоматическое обновление** проверяет сертификат каждый день
- **Обновление происходит** когда до истечения остается менее 30 дней
- **Рекомендуется** обновлять за 30 дней до истечения

### Что происходит при обновлении?

1. Certbot проверяет срок действия сертификата
2. Если до истечения < 30 дней, получает новый сертификат
3. Сохраняет новый сертификат в `/etc/letsencrypt/live/rocknrollracing.online/`
4. Перезапускает nginx контейнер для применения нового сертификата
5. Сайт продолжает работать без перерывов

### Нужно ли останавливать nginx для обновления?

**Нет!** Скрипт использует `certbot renew`, который работает в **webroot** режиме (если настроен) или может временно остановить nginx автоматически. После обновления nginx перезапускается автоматически.

### Можно ли обновить вручную?

Да, в любой момент:

```bash
cd /root/Rock-n-Roll-Racing-Rating-App
sudo ./scripts/ssl/renew-ssl.sh
```

Или напрямую через certbot:

```bash
sudo certbot renew
docker compose -f docker-compose.prod.bogdan.yml restart nginx
```

---

## Резюме команд

```bash
# 1. Обновить путь в скрипте
nano scripts/ssl/renew-ssl.sh  # Изменить PROJECT_DIR

# 2. Сделать исполняемым
chmod +x scripts/ssl/renew-ssl.sh

# 3. Тест
sudo certbot renew --dry-run

# 4. Создать systemd service и timer (см. выше)

# 5. Активировать
sudo systemctl daemon-reload
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer

# 6. Проверить
sudo systemctl status certbot-renew.timer
sudo systemctl list-timers | grep certbot
```

**Готово!** Теперь сертификат будет обновляться автоматически каждые 90 дней (или раньше, если до истечения осталось менее 30 дней).
