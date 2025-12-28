#!/bin/bash

# Скрипт для поиска пика трафика по часам
# Помогает определить точное время, когда был использован трафик

set -e

DAYS_AGO=${1:-1}  # По умолчанию вчера
DATE_STR=$(date -d "$DAYS_AGO days ago" +"%Y-%m-%d" 2>/dev/null || date -v-${DAYS_AGO}d +"%Y-%m-%d" 2>/dev/null || date +"%Y-%m-%d")

echo "=========================================="
echo "Поиск пика трафика по часам"
echo "Дата: $DATE_STR"
echo "=========================================="
echo ""

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# 1. Анализ по часам через Nginx логи
echo "1. Анализ трафика по часам (Nginx логи):"
echo "-----------------------------------"

if [ -f /var/log/nginx/access.log ]; then
    info "Группировка запросов по часам из /var/log/nginx/access.log:"
    
    # Для каждого часа считаем запросы
    for hour in {00..23}; do
        count=$(grep "$DATE_STR" /var/log/nginx/access.log 2>/dev/null | grep -c ":$hour:" || echo "0")
        if [ "$count" -gt 0 ]; then
            printf "  %02d:00 - %02d:59: %8d запросов\n" "$hour" "$hour" "$count"
        fi
    done | sort -k3 -rn
    
    echo ""
    
    # Топ часа по запросам
    echo "ТОП 5 часов по количеству запросов:"
    for hour in {00..23}; do
        count=$(grep "$DATE_STR" /var/log/nginx/access.log 2>/dev/null | grep -c ":$hour:" || echo "0")
        echo "$count $hour"
    done | sort -rn | head -5 | while read count hour; do
        printf "  %02d:00 - %02d:59: %8d запросов\n" "$hour" "$hour" "$count"
    done
    echo ""
else
    echo "Логи Nginx на диске не найдены. Проверяю Docker логи..."
    
    if docker ps -a --format "{{.Names}}" | grep -q rnr_racing_nginx; then
        NGINX_CONTAINER=$(docker ps -a --format "{{.Names}}" | grep rnr_racing_nginx | head -1)
        info "Анализ логов контейнера $NGINX_CONTAINER..."
        
        # Получаем логи за день и анализируем
        docker logs --since "${DATE_STR} 00:00:00" --until "${DATE_STR} 23:59:59" "$NGINX_CONTAINER" 2>&1 | \
        grep -oE '\[.*\]' | sed 's/\[//g; s/\]//g' | cut -d: -f1-2 | sort | uniq -c | sort -rn | head -10
        
        echo ""
    fi
fi

# 2. Анализ Docker stats (если доступно)
echo "2. Проверка системных событий по часам:"
echo "-----------------------------------"
if command -v journalctl &> /dev/null; then
    info "Подсчет системных событий по часам (journalctl):"
    
    for hour in {00..23}; do
        count=$(sudo journalctl --since "${DATE_STR} ${hour}:00:00" --until "${DATE_STR} ${hour}:59:59" --no-pager 2>/dev/null | wc -l || echo "0")
        if [ "$count" -gt 100 ]; then  # Показываем только часы с активностью
            printf "  %02d:00 - %02d:59: %8d событий\n" "$hour" "$hour" "$count"
        fi
    done | sort -k3 -rn | head -10
    
    echo ""
fi

# 3. Анализ конкретных временных окон
echo "3. Детальный анализ подозрительных периодов:"
echo "-----------------------------------"
info "Для детального анализа выберите час с высокой активностью и выполните:"
echo ""
echo "  # Например, для 20:00-21:00:"
echo "  sudo journalctl --since '${DATE_STR} 20:00:00' --until '${DATE_STR} 21:00:00'"
echo ""
echo "  # Логи Docker приложения за этот период:"
echo "  docker logs --since '${DATE_STR} 20:00:00' --until '${DATE_STR} 21:00:00' rnr_racing_app_bogdan"
echo ""
echo "  # Логи Nginx за этот период:"
if [ -f /var/log/nginx/access.log ]; then
    echo "  grep '${DATE_STR}' /var/log/nginx/access.log | grep '20:' | head -100"
else
    echo "  docker logs --since '${DATE_STR} 20:00:00' --until '${DATE_STR} 21:00:00' rnr_racing_nginx_bogdan"
fi
echo ""

# 4. Рекомендации
echo "=========================================="
echo "Рекомендации:"
echo "=========================================="
echo ""
echo "1. Если обнаружен час с высокой активностью, детально проанализируйте его:"
echo "   ./analyze-historical-logs.sh $DAYS_AGO"
echo ""
echo "2. Сохраните логи пикового часа:"
echo "   sudo journalctl --since '${DATE_STR} 20:00:00' --until '${DATE_STR} 21:00:00' > /tmp/peak_hour_logs.txt"
echo ""
echo "3. Проверьте сетевую активность через iftop в реальном времени (для будущего):"
echo "   sudo iftop -i eth0 -t -s 60"
echo ""

