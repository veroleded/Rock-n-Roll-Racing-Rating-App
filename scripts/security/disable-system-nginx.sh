#!/bin/bash

# Скрипт для отключения системного nginx и освобождения портов 80 и 443
# Использование: sudo ./scripts/security/disable-system-nginx.sh

set -e

echo "=========================================="
echo "  Отключение системного nginx"
echo "=========================================="
echo ""

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Этот скрипт должен быть запущен с правами root (sudo)"
    exit 1
fi

# Проверка, установлен ли системный nginx
if ! command -v nginx &> /dev/null && ! systemctl list-unit-files | grep -q nginx.service; then
    echo "✅ Системный nginx не установлен или не найден"
    exit 0
fi

echo "📋 1. Проверка статуса системного nginx..."
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo "   ⚠️  Системный nginx запущен"
    
    echo ""
    echo "🛑 2. Остановка системного nginx..."
    systemctl stop nginx
    echo "   ✅ nginx остановлен"
else
    echo "   ✅ Системный nginx не запущен"
fi

echo ""
echo "🚫 3. Отключение автозапуска nginx..."
systemctl disable nginx 2>/dev/null || echo "   ⚠️  Не удалось отключить (возможно, уже отключен)"
echo "   ✅ Автозапуск отключен"

echo ""
echo "🔍 4. Проверка занятости портов 80 и 443..."
if command -v netstat &> /dev/null; then
    PORT_80=$(netstat -tuln | grep ':80 ' | grep LISTEN || echo "")
    PORT_443=$(netstat -tuln | grep ':443 ' | grep LISTEN || echo "")
elif command -v ss &> /dev/null; then
    PORT_80=$(ss -tuln | grep ':80 ' | grep LISTEN || echo "")
    PORT_443=$(ss -tuln | grep ':443 ' | grep LISTEN || echo "")
else
    PORT_80=""
    PORT_443=""
    echo "   ⚠️  netstat и ss не найдены, пропускаем проверку портов"
fi

if [ ! -z "$PORT_80" ]; then
    echo "   ⚠️  Порт 80 занят:"
    echo "$PORT_80" | head -3
    echo ""
    echo "   Проверьте, что это Docker контейнер:"
    echo "   docker ps | grep nginx"
else
    echo "   ✅ Порт 80 свободен"
fi

if [ ! -z "$PORT_443" ]; then
    echo "   ⚠️  Порт 443 занят:"
    echo "$PORT_443" | head -3
    echo ""
    echo "   Проверьте, что это Docker контейнер:"
    echo "   docker ps | grep nginx"
else
    echo "   ✅ Порт 443 свободен"
fi

echo ""
echo "🐳 5. Проверка Docker nginx контейнера..."
if command -v docker &> /dev/null; then
    if docker ps --format '{{.Names}}' | grep -q "nginx"; then
        NGINX_CONTAINER=$(docker ps --format '{{.Names}}' | grep "nginx" | head -1)
        echo "   ✅ Docker nginx контейнер запущен: $NGINX_CONTAINER"
        
        # Проверяем, слушает ли контейнер порты 80 и 443
        CONTAINER_PORTS=$(docker port "$NGINX_CONTAINER" 2>/dev/null || echo "")
        if echo "$CONTAINER_PORTS" | grep -q "80\|443"; then
            echo "   ✅ Контейнер использует порты 80/443"
        fi
    else
        echo "   ⚠️  Docker nginx контейнер не найден"
        echo "   Запустите: docker-compose -f docker-compose.prod.bogdan.yml up -d nginx"
    fi
else
    echo "   ⚠️  Docker не установлен"
fi

echo ""
echo "=========================================="
echo "  ✅ Готово!"
echo "=========================================="
echo ""
echo "📋 Следующие шаги:"
echo ""
echo "1. Убедитесь, что Docker nginx контейнер запущен:"
echo "   docker-compose -f docker-compose.prod.bogdan.yml ps nginx"
echo ""
echo "2. Проверьте, что порты 80 и 443 слушает Docker контейнер:"
echo "   sudo ss -tuln | grep -E ':(80|443) '"
echo ""
echo "3. Если системный nginx все еще мешает, можно удалить его:"
echo "   sudo apt remove --purge nginx nginx-common nginx-core"
echo ""
echo "4. Проверьте статус системного nginx:"
echo "   sudo systemctl status nginx"
echo ""

