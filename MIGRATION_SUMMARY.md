# ✅ Миграция завершена!

## 📁 Новая структура

Все скрипты и документация организованы по папкам:

```
discord-bot-new/
├── docs/                    # Вся документация
│   ├── monitoring/         # Мониторинг
│   ├── deployment/        # Развертывание
│   ├── ssl/               # SSL
│   ├── migrations/        # Миграции
│   ├── cleanup/          # Очистка
│   ├── general/          # Общее
│   ├── SCRIPTS_INDEX.md  # Индекс
│   └── START_HERE.md     # Быстрый старт
│
└── scripts/               # Все скрипты
    ├── monitoring/       # Мониторинг
    ├── deployment/       # Развертывание
    ├── analysis/         # Анализ
    ├── ssl/              # SSL
    ├── migrations/       # Миграции
    └── cleanup/          # Очистка
```

## ⚠️ ЧТО НУЖНО СДЕЛАТЬ НА СЕРВЕРЕ

### 1. Обновить cron задачи

**Выполните на сервере:**

```bash
# Создать резервную копию
crontab -l > crontab.backup

# Обновить пути автоматически
crontab -l | sed 's|scripts/cleanup-metrics-logs.sh|scripts/cleanup/cleanup-metrics-logs.sh|g' | \
           sed 's|scripts/cleanup-all-logs.sh|scripts/cleanup/cleanup-all-logs.sh|g' | crontab -

# Проверить
crontab -l | grep cleanup
```

**Или вручную:**

```bash
crontab -e
# Заменить:
# scripts/cleanup-metrics-logs.sh → scripts/cleanup/cleanup-metrics-logs.sh
# scripts/cleanup-all-logs.sh → scripts/cleanup/cleanup-all-logs.sh
```

### 2. Обновить systemd timers (ОБЯЗАТЕЛЬНО, если используются!)

Если у вас настроены systemd timers для SSL:

```bash
# Проверить какие timers есть
sudo systemctl list-unit-files | grep -E "ssl|certbot"

# Обновить service файл
sudo nano /etc/systemd/system/certbot-renew.service
```

**Обновить пути в файле:**
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

### 3. Обновить setup-log-cleanup-cron.sh (если используется)

Скрипт уже обновлен в репозитории, но если он был изменен на сервере:

```bash
# На сервере
cd /root/Rock-n-Roll-Racing-Rating-App
git pull  # или обновить вручную

# Или обновить вручную:
sed -i 's|scripts/cleanup-metrics-logs.sh|scripts/cleanup/cleanup-metrics-logs.sh|g' scripts/setup-log-cleanup-cron.sh
sed -i 's|scripts/cleanup-all-logs.sh|scripts/cleanup/cleanup-all-logs.sh|g' scripts/setup-log-cleanup-cron.sh
```

### 4. Проверить права на скрипты

```bash
chmod +x scripts/cleanup/*.sh
```

### 5. Тестовый запуск

```bash
# Проверить что скрипты работают
bash scripts/cleanup/cleanup-metrics-logs.sh 30
bash scripts/cleanup/cleanup-all-logs.sh
```

## 📚 Документация

- **Обновление systemd timers:** [UPDATE_SYSTEMD_TIMERS.md](./UPDATE_SYSTEMD_TIMERS.md) ⚠️ **ВАЖНО!**
- **Полное руководство:** [docs/SERVER_MIGRATION_GUIDE.md](./docs/SERVER_MIGRATION_GUIDE.md)
- **Структура проекта:** [docs/STRUCTURE.md](./docs/STRUCTURE.md)
- **Индекс скриптов:** [docs/SCRIPTS_INDEX.md](./docs/SCRIPTS_INDEX.md)

## ✅ Проверка

После обновления проверьте:

```bash
# 1. Cron задачи
crontab -l | grep cleanup

# 2. Существование скриптов
ls -la scripts/cleanup/

# 3. Тестовый запуск
bash scripts/cleanup/cleanup-metrics-logs.sh 30

# 4. Логи
tail -f logs/cleanup.log
```

## 🎯 Быстрые команды

```bash
# Обновить все пути в cron одной командой
crontab -l | sed 's|scripts/cleanup-metrics-logs.sh|scripts/cleanup/cleanup-metrics-logs.sh|g' | \
           sed 's|scripts/cleanup-all-logs.sh|scripts/cleanup/cleanup-all-logs.sh|g' | crontab -

# Проверить результат
crontab -l
```
