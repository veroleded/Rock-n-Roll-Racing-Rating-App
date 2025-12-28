#!/bin/bash

# Скрипт для непрерывного мониторинга трафика
# Использование: ./monitor-traffic-continuous.sh [URL] [интервал в секундах]
# По умолчанию: http://localhost:3000, интервал 30 секунд

METRICS_URL="${1:-http://localhost:3000/api/metrics}"
INTERVAL="${2:-30}"

# Функция для форматирования байтов
format_bytes() {
    local bytes=$1
    if [ -z "$bytes" ] || [ "$bytes" = "0" ]; then
        printf "0 B"
        return
    fi
    
    # Убираем дробную часть если есть
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

# Получаем метрики
get_metrics() {
    curl -s "$METRICS_URL" 2>/dev/null
}

echo "=========================================="
echo "  Непрерывный мониторинг трафика"
echo "=========================================="
echo "URL: $METRICS_URL"
echo "Интервал обновления: ${INTERVAL} секунд"
echo "Нажмите Ctrl+C для остановки"
echo "=========================================="
echo ""

PREV_BYTES_OUT=0
PREV_BYTES_IN=0
PREV_TIME=$(date +%s)

while true; do
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - PREV_TIME))
    
    # Получаем метрики
    METRICS=$(get_metrics)
    
    if [ -z "$METRICS" ]; then
        echo "[$(date '+%H:%M:%S')] ❌ Ошибка: Не удалось получить метрики"
        sleep $INTERVAL
        continue
    fi
    
    # Исходящий трафик
    BYTES_OUT=$(echo "$METRICS" | grep "^network_bytes_out_total" | awk '{print $2}' | head -1)
    if [ -z "$BYTES_OUT" ]; then
        BYTES_OUT=0
    fi
    
    # Входящий трафик
    BYTES_IN=$(echo "$METRICS" | grep "^network_bytes_in_total" | awk '{print $2}' | head -1)
    if [ -z "$BYTES_IN" ]; then
        BYTES_IN=0
    fi
    
    # Redis подписки
    REDIS_SUBS=$(echo "$METRICS" | grep "^redis_subscriptions_active" | awk '{print $2}' | head -1)
    if [ -z "$REDIS_SUBS" ]; then
        REDIS_SUBS=0
    fi
    
    # Discord переподключения
    DISCORD_RECONNECTS=$(echo "$METRICS" | grep "^discord_reconnects_total" | awk '{print $2}' | head -1)
    if [ -z "$DISCORD_RECONNECTS" ]; then
        DISCORD_RECONNECTS=0
    fi
    
    # Вычисляем скорость
    BYTES_OUT_INT=${BYTES_OUT%.*}
    BYTES_IN_INT=${BYTES_IN%.*}
    
    if [ $PREV_BYTES_OUT -gt 0 ] && [ $TIME_DIFF -gt 0 ]; then
        OUT_RATE=$(( (BYTES_OUT_INT - PREV_BYTES_OUT) / TIME_DIFF ))
        IN_RATE=$(( (BYTES_IN_INT - PREV_BYTES_IN) / TIME_DIFF ))
    else
        OUT_RATE=0
        IN_RATE=0
    fi
    
    # Очищаем строку
    echo -ne "\r\033[K"
    
    # Выводим информацию
    echo -ne "[$(date '+%H:%M:%S')] "
    echo -ne "📤 $(format_bytes $BYTES_OUT_INT) "
    echo -ne "($(format_bytes $OUT_RATE)/s) | "
    echo -ne "📥 $(format_bytes $BYTES_IN_INT) "
    echo -ne "($(format_bytes $IN_RATE)/s) | "
    echo -ne "🔴 Redis: $REDIS_SUBS | "
    echo -ne "🤖 Discord: $DISCORD_RECONNECTS"
    
    # Предупреждения (используем awk для больших чисел)
    if [ ! -z "$BYTES_OUT" ] && [ "$BYTES_OUT" != "0" ]; then
        TRAFFIC_CHECK=$(echo "$BYTES_OUT 10737418240" | awk '{if ($1 > $2) print "critical"; else if ($1 > 1073741824) print "high"; else print "ok"}')
        
        if [ "$TRAFFIC_CHECK" = "critical" ]; then
            echo -ne " | ⚠️  КРИТИЧЕСКИЙ ТРАФИК!"
        elif [ "$TRAFFIC_CHECK" = "high" ]; then
            echo -ne " | ⚠️  Высокий трафик"
        fi
    fi
    
    if [ $REDIS_SUBS -gt 5 ]; then
        echo -ne " | ⚠️  Много подписок Redis"
    fi
    
    PREV_BYTES_OUT=$BYTES_OUT_INT
    PREV_BYTES_IN=$BYTES_IN_INT
    PREV_TIME=$CURRENT_TIME
    
    sleep $INTERVAL
done

