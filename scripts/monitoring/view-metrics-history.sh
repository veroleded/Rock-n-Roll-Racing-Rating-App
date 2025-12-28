#!/bin/bash

# Скрипт для просмотра истории сохраненных метрик
# Использование: ./view-metrics-history.sh [URL] [опции]
# По умолчанию: http://localhost:3000

METRICS_URL="${1:-http://localhost:3000}"

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

echo "=========================================="
echo "  История метрик"
echo "=========================================="
echo "URL: $METRICS_URL"
echo ""

# Получаем последние 20 записей
echo "📊 Последние записи метрик:"
echo ""

HISTORY=$(curl -s "${METRICS_URL}/api/metrics/history?limit=20")

if [ -z "$HISTORY" ] || [ "$HISTORY" = "[]" ]; then
    echo "❌ История метрик пуста или недоступна"
    echo "Проверьте, что приложение запущено и метрики сохраняются"
    exit 1
fi

# Парсим JSON и выводим в читаемом формате
echo "$HISTORY" | python3 -m json.tool 2>/dev/null | grep -E "(timestamp|networkBytesOut|networkBytesIn|redisSubscriptions|discordReconnects)" | while IFS= read -r line; do
    if [[ $line == *"timestamp"* ]]; then
        timestamp=$(echo "$line" | sed 's/.*"timestamp": "\([^"]*\)".*/\1/')
        echo ""
        echo "⏰ $(echo $timestamp | cut -d'T' -f1) $(echo $timestamp | cut -d'T' -f2 | cut -d'.' -f1)"
    elif [[ $line == *"networkBytesOut"* ]]; then
        bytes=$(echo "$line" | sed 's/.*"networkBytesOut": \([0-9.]*\).*/\1/')
        echo "   📤 Исходящий: $(format_bytes ${bytes%.*})"
    elif [[ $line == *"networkBytesIn"* ]]; then
        bytes=$(echo "$line" | sed 's/.*"networkBytesIn": \([0-9.]*\).*/\1/')
        echo "   📥 Входящий: $(format_bytes ${bytes%.*})"
    elif [[ $line == *"redisSubscriptions"* ]]; then
        subs=$(echo "$line" | sed 's/.*"redisSubscriptions": \([0-9.]*\).*/\1/')
        echo "   🔴 Redis подписки: ${subs%.*}"
    elif [[ $line == *"discordReconnects"* ]]; then
        reconnects=$(echo "$line" | sed 's/.*"discordReconnects": \([0-9.]*\).*/\1/')
        echo "   🤖 Discord переподключения: ${reconnects%.*}"
    fi
done

echo ""
echo "=========================================="
echo ""
echo "📈 Статистика за весь период:"
echo ""

STATS=$(curl -s "${METRICS_URL}/api/metrics/history?stats=true")

if [ ! -z "$STATS" ] && [ "$STATS" != "{}" ]; then
    totalOut=$(echo "$STATS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('totalBytesOut', 0))" 2>/dev/null)
    totalIn=$(echo "$STATS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('totalBytesIn', 0))" 2>/dev/null)
    maxOut=$(echo "$STATS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('maxBytesOut', 0))" 2>/dev/null)
    maxIn=$(echo "$STATS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('maxBytesIn', 0))" 2>/dev/null)
    count=$(echo "$STATS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('count', 0))" 2>/dev/null)
    
    if [ ! -z "$totalOut" ] && [ "$totalOut" != "0" ]; then
        echo "   Всего исходящего трафика: $(format_bytes ${totalOut%.*})"
        echo "   Всего входящего трафика: $(format_bytes ${totalIn%.*})"
        echo "   Максимум исходящего: $(format_bytes ${maxOut%.*})"
        echo "   Максимум входящего: $(format_bytes ${maxIn%.*})"
        echo "   Количество записей: $count"
    else
        echo "   Нет данных для отображения"
    fi
else
    echo "   Статистика недоступна"
fi

echo ""
echo "=========================================="

