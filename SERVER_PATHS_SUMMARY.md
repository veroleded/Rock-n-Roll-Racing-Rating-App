# ✅ Все пути обновлены на реальный путь сервера

## 📍 Реальный путь на сервере

**Путь к проекту:** `/root/Rock-n-Roll-Racing-Rating-App`

## ✅ Что было обновлено

### В скриптах
- ✅ `scripts/ssl/renew-ssl.sh` - содержит правильный путь: `/root/Rock-n-Roll-Racing-Rating-App`
- ✅ `scripts/setup-log-cleanup-cron.sh` - автоматически определяет путь
- ✅ `scripts/cleanup/cleanup-all-logs.sh` - автоматически определяет путь

### В документации
Обновлены все примеры путей:
- ✅ `/path/to/project` → `/root/Rock-n-Roll-Racing-Rating-App`
- ✅ `~/projects/discord-bot-new` → `/root/Rock-n-Roll-Racing-Rating-App`
- ✅ `/home/ваш_пользователь/...` → `/root/Rock-n-Roll-Racing-Rating-App`
- ✅ `renew-ssl.sh` → `scripts/ssl/renew-ssl.sh`
- ✅ `check-ssl.sh` → `scripts/ssl/check-ssl.sh`
- ✅ `cleanup-metrics-logs.sh` → `scripts/cleanup/cleanup-metrics-logs.sh`
- ✅ `cleanup-all-logs.sh` → `scripts/cleanup/cleanup-all-logs.sh`

## ⚠️ ЧТО НУЖНО СДЕЛАТЬ НА СЕРВЕРЕ

### 1. Обновить cron задачи (ОБЯЗАТЕЛЬНО!)

```bash
# Создать резервную копию
crontab -l > crontab.backup

# Обновить пути автоматически
crontab -l | sed 's|/path/to/project|/root/Rock-n-Roll-Racing-Rating-App|g' | \
           sed 's|scripts/cleanup-metrics-logs.sh|scripts/cleanup/cleanup-metrics-logs.sh|g' | \
           sed 's|scripts/cleanup-all-logs.sh|scripts/cleanup/cleanup-all-logs.sh|g' | \
           sed 's|renew-ssl.sh|scripts/ssl/renew-ssl.sh|g' | \
           sed 's|check-ssl.sh|scripts/ssl/check-ssl.sh|g' | crontab -

# Проверить
crontab -l
```

**Ожидаемый результат:**
```bash
0 2 * * * cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup/cleanup-metrics-logs.sh 30 >> logs/cleanup.log 2>&1
0 3 * * 0 cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup/cleanup-all-logs.sh >> logs/cleanup.log 2>&1
```

### 2. Обновить Systemd service и timer файлы (ОБЯЗАТЕЛЬНО, если используются!)

**Проверить какие timers есть:**
```bash
sudo systemctl list-unit-files | grep -E "ssl|certbot|cleanup"
```

**Обновить SSL service файл:**
```bash
sudo nano /etc/systemd/system/certbot-renew.service
```

**Обновить пути в файле:**
```ini
[Service]
Type=oneshot
ExecStart=/root/Rock-n-Roll-Racing-Rating-App/scripts/ssl/renew-ssl.sh
WorkingDirectory=/root/Rock-n-Roll-Racing-Rating-App
User=root
Group=root
```

**После обновления:**
```bash
# Перезагрузить systemd
sudo systemctl daemon-reload

# Перезапустить timer
sudo systemctl restart certbot-renew.timer

# Проверить статус
sudo systemctl status certbot-renew.timer
sudo systemctl list-timers | grep certbot
```

### 3. Проверить права на скрипты

```bash
cd /root/Rock-n-Roll-Racing-Rating-App
chmod +x scripts/cleanup/*.sh
chmod +x scripts/ssl/*.sh
chmod +x scripts/monitoring/*.sh
```

### 4. Тестовый запуск

```bash
cd /root/Rock-n-Roll-Racing-Rating-App

# Проверить очистку логов
bash scripts/cleanup/cleanup-metrics-logs.sh 30

# Проверить SSL
bash scripts/ssl/check-ssl.sh
```

## 📋 Проверка после обновления

```bash
# 1. Проверить cron задачи
crontab -l | grep -E "cleanup|ssl"

# 2. Проверить существование скриптов
ls -la /root/Rock-n-Roll-Racing-Rating-App/scripts/cleanup/
ls -la /root/Rock-n-Roll-Racing-Rating-App/scripts/ssl/

# 3. Проверить логи
tail -f /root/Rock-n-Roll-Racing-Rating-App/logs/cleanup.log
```

## 📚 Дополнительная информация

- **Обновление systemd timers:** [UPDATE_SYSTEMD_TIMERS.md](./UPDATE_SYSTEMD_TIMERS.md) ⚠️ **ВАЖНО!**
- **Полное руководство по миграции:** [docs/SERVER_MIGRATION_GUIDE.md](./docs/SERVER_MIGRATION_GUIDE.md)
- **Инструкции по обновлению:** [SERVER_UPDATE_INSTRUCTIONS.md](./SERVER_UPDATE_INSTRUCTIONS.md)
- **Структура проекта:** [docs/STRUCTURE.md](./docs/STRUCTURE.md)

## ✅ Итог

Все пути в скриптах и документации обновлены на реальный путь сервера: `/root/Rock-n-Roll-Racing-Rating-App`

**Следующий шаг:** Обновите cron задачи на сервере (см. выше)

