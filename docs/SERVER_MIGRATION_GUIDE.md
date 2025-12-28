# 🔄 Руководство по миграции на сервере

После реорганизации структуры проекта нужно обновить пути в скриптах и cron задачах на сервере.

## 📋 Что нужно изменить

### 1. Cron задачи для очистки логов

**Старые пути:**

```bash
0 2 * * * cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup-metrics-logs.sh 30
0 3 * * 0 cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup-all-logs.sh
```

**Новые пути:**

```bash
0 2 * * * cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup/cleanup-metrics-logs.sh 30
0 3 * * 0 cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup/cleanup-all-logs.sh
```

**Как обновить:**

```bash
# Открыть crontab
crontab -e

# Найти строки с cleanup-*.sh и заменить:
# scripts/cleanup-metrics-logs.sh → scripts/cleanup/cleanup-metrics-logs.sh
# scripts/cleanup-all-logs.sh → scripts/cleanup/cleanup-all-logs.sh
```

### 2. Скрипт setup-log-cleanup-cron.sh

**Старый путь в скрипте:**

```bash
bash scripts/cleanup-metrics-logs.sh
bash scripts/cleanup-all-logs.sh
```

**Новый путь:**

```bash
bash scripts/cleanup/cleanup-metrics-logs.sh
bash scripts/cleanup/cleanup-all-logs.sh
```

**Как обновить:**

```bash
# На сервере отредактировать файл
nano scripts/setup-log-cleanup-cron.sh

# Заменить все вхождения:
# scripts/cleanup-metrics-logs.sh → scripts/cleanup/cleanup-metrics-logs.sh
# scripts/cleanup-all-logs.sh → scripts/cleanup/cleanup-all-logs.sh
```

### 3. Скрипты развертывания

Если используются скрипты развертывания, проверьте пути:

**Проверить:**

- `scripts/deployment/update-fedor-production.sh` - должен работать как есть
- Все ссылки на другие скрипты внутри скриптов развертывания

### 4. Systemd timers (ОБЯЗАТЕЛЬНО, если используются!)

Если настроены systemd timers для SSL обновления, нужно обновить пути в `.service` файлах.

**Проверить какие timers есть:**

```bash
sudo systemctl list-unit-files | grep -E "ssl|certbot|cleanup"
```

**Обновить SSL service файл:**

```bash
sudo nano /etc/systemd/system/certbot-renew.service
```

**Обновить содержимое:**

```ini
[Unit]
Description=Certbot SSL Certificate Renewal for rocknrollracing.online
After=network.target docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/root/Rock-n-Roll-Racing-Rating-App/scripts/ssl/renew-ssl.sh
WorkingDirectory=/root/Rock-n-Roll-Racing-Rating-App
User=root
Group=root

# Логирование
StandardOutput=journal
StandardError=journal

# Переменные окружения
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
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

**Автоматическое обновление:**

```bash
# Использовать готовый скрипт
sudo /root/Rock-n-Roll-Racing-Rating-App/scripts/deployment/update-systemd-timers.sh
```

**Подробная инструкция:** [UPDATE_SYSTEMD_TIMERS.md](../UPDATE_SYSTEMD_TIMERS.md)

## 🔧 Быстрое обновление

### Автоматическое обновление cron задач

```bash
# На сервере выполните:
cd /root/Rock-n-Roll-Racing-Rating-App

# Создать резервную копию
crontab -l > crontab.backup

# Обновить пути
crontab -l | sed 's|scripts/cleanup-metrics-logs.sh|scripts/cleanup/cleanup-metrics-logs.sh|g' | \
           sed 's|scripts/cleanup-all-logs.sh|scripts/cleanup/cleanup-all-logs.sh|g' | crontab -

# Проверить
crontab -l
```

### Обновление setup-log-cleanup-cron.sh

```bash
# На сервере
cd /root/Rock-n-Roll-Racing-Rating-App

# Обновить пути в скрипте
sed -i 's|scripts/cleanup-metrics-logs.sh|scripts/cleanup/cleanup-metrics-logs.sh|g' scripts/setup-log-cleanup-cron.sh
sed -i 's|scripts/cleanup-all-logs.sh|scripts/cleanup/cleanup-all-logs.sh|g' scripts/setup-log-cleanup-cron.sh

# Проверить
grep "cleanup" scripts/setup-log-cleanup-cron.sh
```

## ✅ Проверка

После обновления проверьте:

```bash
# 1. Проверить cron задачи
crontab -l | grep cleanup

# 2. Проверить, что скрипты существуют
ls -la scripts/cleanup/

# 3. Тестовый запуск (вручную)
bash scripts/cleanup/cleanup-metrics-logs.sh 30

# 4. Проверить логи
tail -f logs/cleanup.log
```

## 📝 Полный список изменений

### Файлы, которые нужно обновить:

1. **Cron задачи** (`crontab -e`)

   - `scripts/cleanup-metrics-logs.sh` → `scripts/cleanup/cleanup-metrics-logs.sh`
   - `scripts/cleanup-all-logs.sh` → `scripts/cleanup/cleanup-all-logs.sh`

2. **scripts/setup-log-cleanup-cron.sh**

   - Обновить пути внутри скрипта

3. **Systemd service файлы** (если есть)

   - Обновить `ExecStart` пути

4. **Любые другие скрипты**, которые вызывают cleanup скрипты
   - Проверить и обновить пути

## 🚨 Важно

- **Сделайте резервную копию** cron задач перед изменением
- **Проверьте** что новые пути существуют
- **Протестируйте** скрипты вручную перед автоматизацией

## 📞 Если что-то пошло не так

Если скрипты не работают:

1. Проверьте права на выполнение:

```bash
chmod +x scripts/cleanup/*.sh
```

2. Проверьте пути:

```bash
ls -la scripts/cleanup/
```

3. Проверьте логи:

```bash
tail -f logs/cleanup.log
```

4. Восстановите из резервной копии:

```bash
crontab crontab.backup
```
