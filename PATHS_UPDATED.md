# ✅ Пути обновлены!

## 📍 Реальный путь на сервере

**Путь к проекту:** `/root/Rock-n-Roll-Racing-Rating-App`

## ✅ Что было обновлено

### Скрипты
- ✅ `scripts/ssl/renew-ssl.sh` - уже содержит правильный путь
- ✅ `scripts/setup-log-cleanup-cron.sh` - использует автоматическое определение пути
- ✅ `scripts/cleanup/cleanup-all-logs.sh` - использует автоматическое определение пути

### Документация
- ✅ Все примеры с `/path/to/project` → `/root/Rock-n-Roll-Racing-Rating-App`
- ✅ Все примеры с `~/projects/discord-bot-new` → `/root/Rock-n-Roll-Racing-Rating-App`
- ✅ Все примеры с `/home/ваш_пользователь/...` → `/root/Rock-n-Roll-Racing-Rating-App`
- ✅ Все упоминания `renew-ssl.sh` → `scripts/ssl/renew-ssl.sh`
- ✅ Все упоминания `check-ssl.sh` → `scripts/ssl/check-ssl.sh`

## 📋 Что нужно проверить на сервере

### 1. Cron задачи

Проверьте, что пути правильные:

```bash
crontab -l | grep -E "cleanup|ssl"
```

Должно быть:
```bash
0 2 * * * cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup/cleanup-metrics-logs.sh 30 >> logs/cleanup.log 2>&1
0 3 * * 0 cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup/cleanup-all-logs.sh >> logs/cleanup.log 2>&1
```

Если есть SSL задачи:
```bash
0 3 * * * /root/Rock-n-Roll-Racing-Rating-App/scripts/ssl/renew-ssl.sh >> /var/log/certbot-renew.log 2>&1
```

### 2. Systemd service файлы (если используются)

Проверьте пути в `.service` файлах:

```bash
# Найти все service файлы
sudo systemctl list-unit-files | grep -E "ssl|certbot|cleanup"

# Проверить конкретный файл
sudo cat /etc/systemd/system/certbot-renew.service | grep ExecStart
```

Должно быть:
```ini
ExecStart=/root/Rock-n-Roll-Racing-Rating-App/scripts/ssl/renew-ssl.sh
WorkingDirectory=/root/Rock-n-Roll-Racing-Rating-App
```

### 3. Проверка скриптов

```bash
cd /root/Rock-n-Roll-Racing-Rating-App

# Проверить что скрипты существуют
ls -la scripts/cleanup/cleanup-metrics-logs.sh
ls -la scripts/cleanup/cleanup-all-logs.sh
ls -la scripts/ssl/renew-ssl.sh
ls -la scripts/ssl/check-ssl.sh

# Проверить права
chmod +x scripts/cleanup/*.sh
chmod +x scripts/ssl/*.sh
```

## 🔧 Быстрое обновление cron на сервере

Если нужно обновить пути в cron:

```bash
# Создать резервную копию
crontab -l > crontab.backup

# Обновить пути
crontab -l | sed 's|/path/to/project|/root/Rock-n-Roll-Racing-Rating-App|g' | \
           sed 's|scripts/cleanup-metrics-logs.sh|scripts/cleanup/cleanup-metrics-logs.sh|g' | \
           sed 's|scripts/cleanup-all-logs.sh|scripts/cleanup/cleanup-all-logs.sh|g' | \
           sed 's|renew-ssl.sh|scripts/ssl/renew-ssl.sh|g' | \
           sed 's|check-ssl.sh|scripts/ssl/check-ssl.sh|g' | crontab -

# Проверить
crontab -l
```

## ✅ Проверка

После обновления проверьте:

```bash
# 1. Проверить cron задачи
crontab -l

# 2. Проверить существование скриптов
ls -la /root/Rock-n-Roll-Racing-Rating-App/scripts/cleanup/
ls -la /root/Rock-n-Roll-Racing-Rating-App/scripts/ssl/

# 3. Тестовый запуск
cd /root/Rock-n-Roll-Racing-Rating-App
bash scripts/cleanup/cleanup-metrics-logs.sh 30
bash scripts/ssl/check-ssl.sh
```

## 📚 Дополнительная информация

- **Миграция на сервере:** [docs/SERVER_MIGRATION_GUIDE.md](./docs/SERVER_MIGRATION_GUIDE.md)
- **Инструкции по обновлению:** [SERVER_UPDATE_INSTRUCTIONS.md](./SERVER_UPDATE_INSTRUCTIONS.md)

