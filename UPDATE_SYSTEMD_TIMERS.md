# ⚠️ Обновление systemd timers на сервере

## 📋 Что нужно обновить

Если у вас настроены systemd timers для SSL обновления, нужно обновить пути в service файлах.

## 🔍 Проверка текущих timers

```bash
# Проверить какие timers есть
sudo systemctl list-unit-files | grep -E "ssl|certbot|cleanup"

# Проверить статус SSL timer
sudo systemctl status certbot-renew.timer

# Посмотреть когда следующий запуск
sudo systemctl list-timers | grep certbot
```

## ✅ Обновление SSL timer

### 1. Обновить service файл

```bash
sudo nano /etc/systemd/system/certbot-renew.service
```

**Обновить содержимое на:**
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

### 2. Перезагрузить systemd

```bash
sudo systemctl daemon-reload
```

### 3. Перезапустить timer

```bash
sudo systemctl restart certbot-renew.timer
```

### 4. Проверить статус

```bash
# Статус timer
sudo systemctl status certbot-renew.timer

# Когда следующий запуск
sudo systemctl list-timers | grep certbot

# Логи (если был запуск)
sudo journalctl -u certbot-renew.service -n 50
```

## 🧪 Тестовый запуск

```bash
# Запустить service вручную для проверки
sudo systemctl start certbot-renew.service

# Проверить логи
sudo journalctl -u certbot-renew.service -f
```

## 📝 Автоматическое обновление (скрипт)

Создайте скрипт для автоматического обновления:

```bash
#!/bin/bash
# update-systemd-timers.sh

SERVICE_FILE="/etc/systemd/system/certbot-renew.service"
PROJECT_PATH="/root/Rock-n-Roll-Racing-Rating-App"

if [ ! -f "$SERVICE_FILE" ]; then
    echo "⚠️  Service файл не найден: $SERVICE_FILE"
    exit 1
fi

# Создать резервную копию
sudo cp "$SERVICE_FILE" "${SERVICE_FILE}.backup"

# Обновить путь в файле
sudo sed -i "s|ExecStart=.*renew-ssl.sh|ExecStart=$PROJECT_PATH/scripts/ssl/renew-ssl.sh|g" "$SERVICE_FILE"
sudo sed -i "s|WorkingDirectory=.*|WorkingDirectory=$PROJECT_PATH|g" "$SERVICE_FILE"
sudo sed -i "s|User=.*|User=root|g" "$SERVICE_FILE"
sudo sed -i "s|Group=.*|Group=root|g" "$SERVICE_FILE"

# Перезагрузить systemd
sudo systemctl daemon-reload

# Перезапустить timer
sudo systemctl restart certbot-renew.timer

echo "✅ Systemd timer обновлен"
echo "Проверьте статус: sudo systemctl status certbot-renew.timer"
```

**Использование:**
```bash
chmod +x update-systemd-timers.sh
sudo ./update-systemd-timers.sh
```

## ✅ Проверка после обновления

```bash
# 1. Проверить содержимое service файла
sudo cat /etc/systemd/system/certbot-renew.service | grep -E "ExecStart|WorkingDirectory|User"

# 2. Проверить статус timer
sudo systemctl status certbot-renew.timer

# 3. Проверить следующий запуск
sudo systemctl list-timers | grep certbot

# 4. Проверить логи
sudo journalctl -u certbot-renew.service --since "1 hour ago"
```

## 🚨 Если что-то пошло не так

### Восстановить из резервной копии:
```bash
sudo cp /etc/systemd/system/certbot-renew.service.backup /etc/systemd/system/certbot-renew.service
sudo systemctl daemon-reload
sudo systemctl restart certbot-renew.timer
```

### Проверить ошибки:
```bash
# Логи systemd
sudo journalctl -u certbot-renew.service -n 100

# Статус timer
sudo systemctl status certbot-renew.timer

# Проверить синтаксис service файла
sudo systemd-analyze verify certbot-renew.service
```

## 📚 Дополнительная информация

- **Настройка SSL timer:** [docs/ssl/AUTO_RENEW_SSL.md](./docs/ssl/AUTO_RENEW_SSL.md)
- **Полное руководство по миграции:** [docs/SERVER_MIGRATION_GUIDE.md](./docs/SERVER_MIGRATION_GUIDE.md)

