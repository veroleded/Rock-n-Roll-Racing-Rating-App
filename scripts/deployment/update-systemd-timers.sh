#!/bin/bash

# Скрипт для автоматического обновления systemd timers
# Использование: sudo ./update-systemd-timers.sh

set -e

PROJECT_PATH="/root/Rock-n-Roll-Racing-Rating-App"
SERVICE_FILE="/etc/systemd/system/certbot-renew.service"

echo "=========================================="
echo "  Обновление systemd timers"
echo "=========================================="
echo ""

# Проверка прав
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Ошибка: Запустите скрипт с sudo"
    exit 1
fi

# Проверка существования service файла
if [ ! -f "$SERVICE_FILE" ]; then
    echo "ℹ️  Service файл не найден: $SERVICE_FILE"
    echo "   Возможно, systemd timer не настроен"
    echo ""
    echo "Проверьте какие timers есть:"
    systemctl list-unit-files | grep -E "ssl|certbot|cleanup" || echo "   Не найдено"
    exit 0
fi

echo "📋 Найден service файл: $SERVICE_FILE"
echo ""

# Создать резервную копию
BACKUP_FILE="${SERVICE_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SERVICE_FILE" "$BACKUP_FILE"
echo "✅ Создана резервная копия: $BACKUP_FILE"
echo ""

# Обновить пути в файле
echo "🔄 Обновление путей в service файле..."

# Обновить ExecStart
sed -i "s|ExecStart=.*renew-ssl.sh|ExecStart=$PROJECT_PATH/scripts/ssl/renew-ssl.sh|g" "$SERVICE_FILE"

# Обновить WorkingDirectory
if grep -q "WorkingDirectory=" "$SERVICE_FILE"; then
    sed -i "s|WorkingDirectory=.*|WorkingDirectory=$PROJECT_PATH|g" "$SERVICE_FILE"
else
    # Добавить WorkingDirectory если его нет
    sed -i "/\[Service\]/a WorkingDirectory=$PROJECT_PATH" "$SERVICE_FILE"
fi

# Обновить User
sed -i "s|^User=.*|User=root|g" "$SERVICE_FILE"
if ! grep -q "^User=" "$SERVICE_FILE"; then
    sed -i "/\[Service\]/a User=root" "$SERVICE_FILE"
fi

# Обновить Group
sed -i "s|^Group=.*|Group=root|g" "$SERVICE_FILE"
if ! grep -q "^Group=" "$SERVICE_FILE"; then
    sed -i "/^User=root/a Group=root" "$SERVICE_FILE"
fi

echo "✅ Пути обновлены"
echo ""

# Показать изменения
echo "📄 Обновленное содержимое:"
echo "-----------------------------------"
grep -E "ExecStart|WorkingDirectory|User|Group" "$SERVICE_FILE" || echo "   Не найдено"
echo ""

# Перезагрузить systemd
echo "🔄 Перезагрузка systemd..."
systemctl daemon-reload
echo "✅ Systemd перезагружен"
echo ""

# Перезапустить timer
TIMER_FILE="${SERVICE_FILE%.service}.timer"
if [ -f "$TIMER_FILE" ]; then
    echo "🔄 Перезапуск timer..."
    systemctl restart "${TIMER_FILE##*/}"
    echo "✅ Timer перезапущен"
    echo ""
    
    # Показать статус
    echo "📊 Статус timer:"
    echo "-----------------------------------"
    systemctl status "${TIMER_FILE##*/}" --no-pager -l || true
    echo ""
    
    echo "📅 Следующий запуск:"
    echo "-----------------------------------"
    systemctl list-timers | grep certbot || echo "   Не найдено"
    echo ""
else
    echo "⚠️  Timer файл не найден: $TIMER_FILE"
    echo "   Service файл обновлен, но timer нужно настроить вручную"
fi

echo "=========================================="
echo "✅ Обновление завершено"
echo ""
echo "💡 Полезные команды:"
echo "   Статус: sudo systemctl status certbot-renew.timer"
echo "   Логи: sudo journalctl -u certbot-renew.service -n 50"
echo "   Следующий запуск: sudo systemctl list-timers | grep certbot"
echo "=========================================="

