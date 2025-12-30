#!/bin/bash

# Скрипт для принудительного завершения процессов nginx
# Использование: sudo ./scripts/security/kill-nginx-processes.sh

set -e

echo "=========================================="
echo "  Завершение процессов nginx"
echo "=========================================="
echo ""

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Этот скрипт должен быть запущен с правами root (sudo)"
    exit 1
fi

# Поиск процессов nginx
echo "🔍 1. Поиск процессов nginx..."
NGINX_PIDS=$(pgrep nginx || echo "")

if [ -z "$NGINX_PIDS" ]; then
    echo "   ✅ Процессы nginx не найдены"
    exit 0
fi

echo "   ⚠️  Найдены процессы nginx:"
echo "$NGINX_PIDS" | while read pid; do
    if [ ! -z "$pid" ]; then
        PROCESS_INFO=$(ps -p "$pid" -o pid,cmd --no-headers 2>/dev/null || echo "")
        if [ ! -z "$PROCESS_INFO" ]; then
            echo "      PID $pid: $PROCESS_INFO"
        fi
    fi
done

echo ""
echo "🛑 2. Завершение процессов nginx..."

# Сначала пытаемся завершить корректно (SIGTERM)
echo "$NGINX_PIDS" | while read pid; do
    if [ ! -z "$pid" ]; then
        echo "   Отправка SIGTERM процессу $pid..."
        kill -TERM "$pid" 2>/dev/null || true
    fi
done

# Ждем 3 секунды
sleep 3

# Проверяем, остались ли процессы
REMAINING_PIDS=$(pgrep nginx || echo "")

if [ ! -z "$REMAINING_PIDS" ]; then
    echo ""
    echo "   ⚠️  Некоторые процессы не завершились, отправка SIGKILL..."
    echo "$REMAINING_PIDS" | while read pid; do
        if [ ! -z "$pid" ]; then
            echo "   Принудительное завершение процесса $pid..."
            kill -KILL "$pid" 2>/dev/null || true
        fi
    done
    
    sleep 1
fi

# Финальная проверка
FINAL_PIDS=$(pgrep nginx || echo "")

if [ -z "$FINAL_PIDS" ]; then
    echo "   ✅ Все процессы nginx завершены"
else
    echo "   ⚠️  Остались процессы: $FINAL_PIDS"
    echo "   Попробуйте завершить их вручную:"
    echo "   sudo kill -9 $FINAL_PIDS"
fi

echo ""
echo "🔍 3. Проверка портов 80 и 443..."
if command -v ss &> /dev/null; then
    PORT_80=$(ss -tulpn | grep ':80 ' | grep LISTEN || echo "")
    PORT_443=$(ss -tulpn | grep ':443 ' | grep LISTEN || echo "")
elif command -v netstat &> /dev/null; then
    PORT_80=$(netstat -tuln | grep ':80 ' | grep LISTEN || echo "")
    PORT_443=$(netstat -tuln | grep ':443 ' | grep LISTEN || echo "")
else
    PORT_80=""
    PORT_443=""
fi

if [ -z "$PORT_80" ] && [ -z "$PORT_443" ]; then
    echo "   ✅ Порты 80 и 443 свободны"
else
    if [ ! -z "$PORT_80" ]; then
        echo "   ⚠️  Порт 80 все еще занят:"
        echo "$PORT_80" | head -2
    fi
    if [ ! -z "$PORT_443" ]; then
        echo "   ⚠️  Порт 443 все еще занят:"
        echo "$PORT_443" | head -2
    fi
fi

echo ""
echo "🐳 4. Проверка Docker nginx контейнера..."
if command -v docker &> /dev/null; then
    if docker ps --format '{{.Names}}' | grep -q "nginx"; then
        NGINX_CONTAINER=$(docker ps --format '{{.Names}}' | grep "nginx" | head -1)
        echo "   ✅ Docker nginx контейнер запущен: $NGINX_CONTAINER"
    else
        echo "   ⚠️  Docker nginx контейнер не запущен"
        echo ""
        echo "   Запустите контейнер:"
        echo "   docker-compose -f docker-compose.prod.bogdan.yml up -d nginx"
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
echo "1. Запустите Docker nginx контейнер:"
echo "   docker-compose -f docker-compose.prod.bogdan.yml up -d nginx"
echo ""
echo "2. Проверьте, что контейнер использует порты:"
echo "   docker ps | grep nginx"
echo "   sudo ss -tulpn | grep -E ':(80|443) '"
echo ""

