#!/bin/bash

# Скрипт для анализа ночного трафика и поиска причин блокировки
# Использование: ./scripts/analysis/analyze-night-traffic.sh [дата в формате YYYY-MM-DD]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

DATE="${1:-$(date -d 'yesterday' '+%Y-%m-%d')}"
NIGHT_START="${2:-22:00}"
NIGHT_END="${3:-06:00}"

echo "=========================================="
echo "  Анализ ночного трафика"
echo "=========================================="
echo "Дата: $DATE"
echo "Период: $NIGHT_START - $NIGHT_END"
echo ""

# Функция для форматирования байт
format_bytes() {
    local bytes=$1
    if [ $bytes -ge 1073741824 ]; then
        echo "$(echo "scale=2; $bytes/1073741824" | bc) GB"
    elif [ $bytes -ge 1048576 ]; then
        echo "$(echo "scale=2; $bytes/1048576" | bc) MB"
    elif [ $bytes -ge 1024 ]; then
        echo "$(echo "scale=2; $bytes/1024" | bc) KB"
    else
        echo "${bytes} B"
    fi
}

# 1. Анализ метрик из файла
echo "📊 1. АНАЛИЗ МЕТРИК ИЗ ФАЙЛА"
echo "----------------------------------------"
METRICS_FILE="logs/metrics/metrics.jsonl"

if [ -f "$METRICS_FILE" ]; then
    # Фильтруем записи за ночь
    NIGHT_START_ISO="${DATE}T${NIGHT_START}:00"
    NIGHT_END_ISO="${DATE}T${NIGHT_END}:00"
    
    # Если ночь переходит через полночь, нужно обработать два дня
    if [ "$NIGHT_END" \< "$NIGHT_START" ]; then
        NEXT_DATE=$(date -d "$DATE +1 day" '+%Y-%m-%d')
        NIGHT_END_ISO="${NEXT_DATE}T${NIGHT_END}:00"
    fi
    
    echo "Поиск записей с $NIGHT_START_ISO по $NIGHT_END_ISO..."
    
    NIGHT_METRICS=$(cat "$METRICS_FILE" | jq -r --arg start "$NIGHT_START_ISO" --arg end "$NIGHT_END_ISO '
        select(.timestamp >= $start and .timestamp <= $end)
    ')
    
    if [ -z "$NIGHT_METRICS" ]; then
        echo "❌ Нет записей метрик за указанный период"
    else
        TOTAL_OUT=$(echo "$NIGHT_METRICS" | jq -s 'map(.networkBytesOut) | add')
        TOTAL_IN=$(echo "$NIGHT_METRICS" | jq -s 'map(.networkBytesIn) | add')
        MAX_OUT=$(echo "$NIGHT_METRICS" | jq -s 'map(.networkBytesOut) | max')
        RECORDS_COUNT=$(echo "$NIGHT_METRICS" | jq -s 'length')
        
        echo "✅ Найдено записей: $RECORDS_COUNT"
        echo "   Исходящий трафик: $(format_bytes ${TOTAL_OUT%.*})"
        echo "   Входящий трафик: $(format_bytes ${TOTAL_IN%.*})"
        echo "   Максимальный исходящий: $(format_bytes ${MAX_OUT%.*})"
        
        # Находим записи с высоким трафиком (> 100 MB)
        HIGH_TRAFFIC=$(echo "$NIGHT_METRICS" | jq -r --argjson threshold 104857600 '
            select(.networkBytesOut > $threshold) | 
            "\(.timestamp) - \(.networkBytesOut) байт"
        ')
        
        if [ ! -z "$HIGH_TRAFFIC" ]; then
            echo ""
            echo "⚠️  Записи с высоким трафиком (> 100 MB):"
            echo "$HIGH_TRAFFIC" | head -10
        fi
    fi
else
    echo "❌ Файл метрик не найден: $METRICS_FILE"
fi

echo ""
echo "📋 2. АНАЛИЗ ЛОГОВ DOCKER КОНТЕЙНЕРОВ"
echo "----------------------------------------"

# Проверяем, запущен ли Docker
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker не установлен или не запущен"
else
    # Логи Discord бота
    echo "🤖 Discord бот:"
    if docker ps --format '{{.Names}}' | grep -q "rnr_racing_app_bogdan\|rnr_racing_app_fedor"; then
        CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep "rnr_racing_app" | head -1)
        echo "   Контейнер: $CONTAINER_NAME"
        
        # Подсчет переподключений
        RECONNECTS=$(docker logs --since "${DATE}T${NIGHT_START}" --until "${DATE}T${NIGHT_END}" "$CONTAINER_NAME" 2>&1 | grep -c "переподключ\|reconnect\|Reconnecting" || echo "0")
        ERRORS=$(docker logs --since "${DATE}T${NIGHT_START}" --until "${DATE}T${NIGHT_END}" "$CONTAINER_NAME" 2>&1 | grep -c "Error\|Ошибка" || echo "0")
        
        echo "   Переподключений: $RECONNECTS"
        echo "   Ошибок: $ERRORS"
        
        if [ "$RECONNECTS" -gt 10 ]; then
            echo "   ⚠️  ВНИМАНИЕ: Много переподключений!"
        fi
    else
        echo "   ❌ Контейнер приложения не найден"
    fi
    
    # Логи Nginx
    echo ""
    echo "🌐 Nginx:"
    if docker ps --format '{{.Names}}' | grep -q "rnr_racing_nginx"; then
        NGINX_CONTAINER=$(docker ps --format '{{.Names}}' | grep "rnr_racing_nginx" | head -1)
        echo "   Контейнер: $NGINX_CONTAINER"
        
        # Подсчет запросов
        REQUESTS=$(docker logs --since "${DATE}T${NIGHT_START}" --until "${DATE}T${NIGHT_END}" "$NGINX_CONTAINER" 2>&1 | grep -c "GET\|POST" || echo "0")
        ERRORS=$(docker logs --since "${DATE}T${NIGHT_START}" --until "${DATE}T${NIGHT_END}" "$NGINX_CONTAINER" 2>&1 | grep -c "error" || echo "0")
        
        echo "   HTTP запросов: $REQUESTS"
        echo "   Ошибок: $ERRORS"
        
        # Топ IP адресов
        TOP_IPS=$(docker logs --since "${DATE}T${NIGHT_START}" --until "${DATE}T${NIGHT_END}" "$NGINX_CONTAINER" 2>&1 | \
            grep -oE "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" | sort | uniq -c | sort -rn | head -5)
        
        if [ ! -z "$TOP_IPS" ]; then
            echo ""
            echo "   Топ IP адресов:"
            echo "$TOP_IPS" | while read count ip; do
                echo "      $ip: $count запросов"
            done
        fi
    else
        echo "   ❌ Контейнер Nginx не найден"
    fi
fi

echo ""
echo "🔴 3. АНАЛИЗ REDIS ПОДПИСОК"
echo "----------------------------------------"

if command -v docker &> /dev/null && docker ps --format '{{.Names}}' | grep -q "rnr_racing_redis"; then
    REDIS_CONTAINER=$(docker ps --format '{{.Names}}' | grep "rnr_racing_redis" | head -1)
    
    # Проверяем активные подписки через Redis CLI
    SUBSCRIPTIONS=$(docker exec "$REDIS_CONTAINER" redis-cli PUBSUB NUMSUB 2>/dev/null | tail -n +2 | awk '{sum+=$2} END {print sum}' || echo "0")
    echo "   Активных подписок: $SUBSCRIPTIONS"
    
    if [ "$SUBSCRIPTIONS" -gt 10 ]; then
        echo "   ⚠️  ВНИМАНИЕ: Много активных подписок!"
    fi
else
    echo "   ❌ Контейнер Redis не найден"
fi

echo ""
echo "📈 4. РЕКОМЕНДАЦИИ"
echo "----------------------------------------"
echo "1. Проверьте логи на предмет множественных переподключений Discord"
echo "2. Проверьте Redis на предмет утечек подписок"
echo "3. Проверьте Nginx на предмет подозрительных IP адресов"
echo "4. Установите rate limiting в Nginx (см. nginx.bogdan.conf)"
echo "5. Мониторьте количество пакетов, а не только байты"
echo ""
echo "Для детального анализа используйте:"
echo "  docker logs --since '${DATE}T${NIGHT_START}' --until '${DATE}T${NIGHT_END}' <container_name> | grep -i error"

