# ⚠️ ИНСТРУКЦИИ ДЛЯ ОБНОВЛЕНИЯ НА СЕРВЕРЕ

## 🎯 Что изменилось

Все скрипты и документация теперь организованы по папкам:

- `scripts/cleanup/` - скрипты очистки
- `scripts/monitoring/` - скрипты мониторинга
- `docs/` - вся документация

## ✅ ЧТО НУЖНО СДЕЛАТЬ НА СЕРВЕРЕ

### 1. Обновить cron задачи (ОБЯЗАТЕЛЬНО!)

**Автоматически (рекомендуется):**

```bash
# Создать резервную копию
crontab -l > crontab.backup

# Обновить пути
crontab -l | sed 's|scripts/cleanup-metrics-logs.sh|scripts/cleanup/cleanup-metrics-logs.sh|g' | \
           sed 's|scripts/cleanup-all-logs.sh|scripts/cleanup/cleanup-all-logs.sh|g' | crontab -

# Проверить
crontab -l | grep cleanup
```

**Вручную:**

```bash
crontab -e
# Найти и заменить:
# scripts/cleanup-metrics-logs.sh → scripts/cleanup/cleanup-metrics-logs.sh
# scripts/cleanup-all-logs.sh → scripts/cleanup/cleanup-all-logs.sh
```

### 2. Обновить systemd timers (ОБЯЗАТЕЛЬНО, если используются!)

**Проверить какие timers есть:**

```bash
sudo systemctl list-unit-files | grep -E "ssl|certbot|cleanup"
```

**Автоматическое обновление (рекомендуется):**

```bash
cd /root/Rock-n-Roll-Racing-Rating-App
sudo ./scripts/deployment/update-systemd-timers.sh
```

**Или вручную:**

```bash
# Обновить service файл
sudo nano /etc/systemd/system/certbot-renew.service
```

**Обновить пути:**

```ini
[Service]
ExecStart=/root/Rock-n-Roll-Racing-Rating-App/scripts/ssl/renew-ssl.sh
WorkingDirectory=/root/Rock-n-Roll-Racing-Rating-App
User=root
```

**После обновления:**

```bash
sudo systemctl daemon-reload
sudo systemctl restart certbot-renew.timer
sudo systemctl status certbot-renew.timer
```

**Подробная инструкция:** [UPDATE_SYSTEMD_TIMERS.md](./UPDATE_SYSTEMD_TIMERS.md)

### 3. Обновить проект на сервере

```bash
cd /root/Rock-n-Roll-Racing-Rating-App
git pull
# или
git fetch && git merge
```

Если у вас настроены systemd timers для SSL или очистки логов:

```bash
# Проверить какие timers есть
sudo systemctl list-unit-files | grep -E "ssl|certbot|cleanup"

# Обновить SSL service файл
sudo nano /etc/systemd/system/certbot-renew.service
```

**Обновить в файле `/etc/systemd/system/certbot-renew.service`:**

```ini
[Service]
ExecStart=/root/Rock-n-Roll-Racing-Rating-App/scripts/ssl/renew-ssl.sh
WorkingDirectory=/root/Rock-n-Roll-Racing-Rating-App
User=root
```

**После обновления:**

```bash
# Перезагрузить systemd
sudo systemctl daemon-reload

# Перезапустить timer
sudo systemctl restart certbot-renew.timer

# Проверить статус
sudo systemctl status certbot-renew.timer
```

### 4. Проверить права на скрипты

```bash
chmod +x scripts/cleanup/*.sh
chmod +x scripts/monitoring/*.sh
```

### 5. Тестовый запуск

```bash
# Проверить что скрипты работают
bash scripts/cleanup/cleanup-metrics-logs.sh 30
bash scripts/cleanup/cleanup-all-logs.sh
```

## 📋 Проверка после обновления

```bash
# 1. Проверить systemd timers
sudo systemctl list-timers | grep certbot
sudo systemctl status certbot-renew.timer

# 2. Проверить cron задачи
crontab -l | grep cleanup
# Должно быть:
# 0 2 * * * cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup/cleanup-metrics-logs.sh 30
# 0 3 * * 0 cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup/cleanup-all-logs.sh

# 3. Проверить существование скриптов
ls -la scripts/cleanup/
ls -la scripts/ssl/
# Должны быть:
# cleanup-metrics-logs.sh, cleanup-all-logs.sh
# renew-ssl.sh, check-ssl.sh

# 4. Проверить логи
tail -f logs/cleanup.log
sudo journalctl -u certbot-renew.service -n 50
```

## 🚨 Если что-то пошло не так

### Восстановить из резервной копии:

```bash
crontab crontab.backup
```

### Проверить пути вручную:

```bash
# Проверить что скрипты существуют
ls -la scripts/cleanup/cleanup-metrics-logs.sh
ls -la scripts/cleanup/cleanup-all-logs.sh

# Если нет - проверить git статус
git status
git pull
```

## 📚 Дополнительная информация

- **Обновление systemd timers:** [UPDATE_SYSTEMD_TIMERS.md](./UPDATE_SYSTEMD_TIMERS.md) ⚠️ **ВАЖНО!**
- **Полное руководство:** [docs/SERVER_MIGRATION_GUIDE.md](./docs/SERVER_MIGRATION_GUIDE.md)
- **Структура проекта:** [docs/STRUCTURE.md](./docs/STRUCTURE.md)

## ⏱️ Время выполнения

- Обновление systemd timers: ~2 минуты
- Обновление cron: ~1 минута
- Обновление проекта: ~2-5 минут (зависит от скорости интернета)
- Проверка: ~1 минута

**Итого: ~6-10 минут**
