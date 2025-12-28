#!/bin/bash

# Скрипт для быстрой проверки трафика на VPS
# Использование: ./check-vps-traffic.sh

echo "=========================================="
echo "  Проверка трафика VPS"
echo "=========================================="
echo "Время: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Функция для форматирования байтов
format_bytes() {
    local bytes=$1
    if [ -z "$bytes" ] || [ "$bytes" = "0" ]; then
        echo "0 B"
        return
    fi
    
    bytes=${bytes%.*}
    
    if [ $bytes -ge 1073741824 ]; then
        local gb=$((bytes / 1073741824))
        local mb=$(((bytes % 1073741824) / 1048576))
        if [ $mb -gt 0 ]; then
            printf "%d.%d GB" $gb $mb
        else
            printf "%d GB" $gb
        fi
    elif [ $bytes -ge 1048576 ]; then
        local mb=$((bytes / 1048576))
        local kb=$(((bytes % 1048576) / 1024))
        if [ $kb -gt 0 ]; then
            printf "%d.%d MB" $mb $kb
        else
            printf "%d MB" $mb
        fi
    elif [ $bytes -ge 1024 ]; then
        local kb=$((bytes / 1024))
        printf "%d KB" $kb
    else
        printf "%d B" $bytes
    fi
}

# 1. vnstat статистика (если установлен)
if command -v vnstat &> /dev/null; then
    echo "📊 Статистика трафика (vnstat):"
    echo "-----------------------------------"
    
    # Статистика за сегодня
    TODAY_STATS=$(vnstat -d --json 2>/dev/null | jq -r '.interfaces[0].traffic.days[0] // empty')
    
    if [ ! -z "$TODAY_STATS" ] && [ "$TODAY_STATS" != "null" ]; then
        RX=$(echo "$TODAY_STATS" | jq -r '.rx // 0')
        TX=$(echo "$TODAY_STATS" | jq -r '.tx // 0')
        
        RX_BYTES=${RX%.*}
        TX_BYTES=${TX%.*}
        
        echo "   📥 Входящий сегодня: $(format_bytes $RX_BYTES)"
        echo "   📤 Исходящий сегодня: $(format_bytes $TX_BYTES)"
        echo ""
        
        # Предупреждение о высоком трафике
        if [ $TX_BYTES -gt 10737418240 ]; then
            echo "   ⚠️  КРИТИЧЕСКОЕ ВНИМАНИЕ: Очень высокий исходящий трафик!"
        elif [ $TX_BYTES -gt 1073741824 ]; then
            echo "   ⚠️  ВНИМАНИЕ: Высокий исходящий трафик (> 1 GB)"
        fi
    else
        echo "   Данные за сегодня пока недоступны"
    fi
    
    # Общая статистика
    echo ""
    echo "   Общая статистика:"
    vnstat -d | tail -3
    echo ""
else
    echo "⚠️  vnstat не установлен. Установите: sudo apt install vnstat"
    echo ""
fi

# 2. Текущие сетевые соединения
echo "🔌 Активные соединения (top 10):"
echo "-----------------------------------"
if command -v ss &> /dev/null; then
    ss -tunap 2>/dev/null | head -11
elif command -v netstat &> /dev/null; then
    netstat -tunap 2>/dev/null | head -11
else
    echo "   ss и netstat не найдены"
fi
echo ""

# 3. Трафик по интерфейсам
echo "📡 Статистика интерфейсов:"
echo "-----------------------------------"
INTERFACE=$(ip route | grep default | awk '{print $5}' | head -1)

if [ ! -z "$INTERFACE" ]; then
    echo "   Основной интерфейс: $INTERFACE"
    
    # Получаем статистику через /proc/net/dev
    if [ -f /proc/net/dev ]; then
        RX_BYTES=$(cat /proc/net/dev | grep "$INTERFACE:" | awk '{print $2}')
        TX_BYTES=$(cat /proc/net/dev | grep "$INTERFACE:" | awk '{print $10}')
        
        if [ ! -z "$RX_BYTES" ] && [ ! -z "$TX_BYTES" ]; then
            echo "   📥 Всего получено: $(format_bytes $RX_BYTES)"
            echo "   📤 Всего отправлено: $(format_bytes $TX_BYTES)"
        fi
    fi
else
    echo "   Не удалось определить интерфейс"
fi
echo ""

# 4. Docker контейнеры (если используется)
if command -v docker &> /dev/null; then
    echo "🐳 Трафик Docker контейнеров:"
    echo "-----------------------------------"
    docker stats --no-stream --format "table {{.Name}}\t{{.NetIO}}" 2>/dev/null | head -10 || echo "   Контейнеры не запущены"
    echo ""
fi

# 5. Процессы с сетевым трафиком (требует nethogs и sudo)
if command -v nethogs &> /dev/null; then
    echo "⚙️  Процессы с трафиком (nethogs):"
    echo "-----------------------------------"
    if [ "$EUID" -eq 0 ]; then
        timeout 3 nethogs -t 2>/dev/null | head -10 || echo "   Не удалось получить данные"
    else
        echo "   Требуются права sudo для просмотра"
        echo "   Запустите: sudo nethogs"
    fi
    echo ""
fi

# 6. Проверка системных ресурсов
echo "💻 Системные ресурсы:"
echo "-----------------------------------"
if command -v free &> /dev/null; then
    echo "   Память:"
    free -h | grep -E "Mem|Swap" | awk '{print "     " $1 ": " $3 " / " $2 " (используется / всего)"}'
fi

if command -v df &> /dev/null; then
    echo "   Диск:"
    df -h / | tail -1 | awk '{print "     Использовано: " $3 " / " $2 " (" $5 ")"}'
fi
echo ""

echo "=========================================="
echo ""
echo "💡 Полезные команды:"
echo "   vnstat -d              - статистика за день"
echo "   sudo iftop -i $INTERFACE  - мониторинг в реальном времени"
echo "   sudo nethogs          - трафик по процессам"
echo "   watch -n 2 vnstat     - обновление каждые 2 сек"
echo ""
echo "=========================================="

