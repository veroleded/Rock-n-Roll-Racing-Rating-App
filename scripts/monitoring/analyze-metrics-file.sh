#!/bin/bash

# Скрипт для анализа файла метрик напрямую
# Использование: ./analyze-metrics-file.sh [путь_к_файлу] [опции]
# По умолчанию: logs/metrics/metrics.jsonl

METRICS_FILE="${1:-logs/metrics/metrics.jsonl}"

if [ ! -f "$METRICS_FILE" ]; then
    echo "❌ Файл не найден: $METRICS_FILE"
    exit 1
fi

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
            printf "%d.%02d GB" $gb $mb
        else
            printf "%d GB" $gb
        fi
    elif [ $bytes -ge 1048576 ]; then
        local mb=$((bytes / 1048576))
        local kb=$(((bytes % 1048576) / 1024))
        if [ $kb -gt 0 ]; then
            printf "%d.%02d MB" $mb $kb
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
echo "  Анализ метрик из файла"
echo "=========================================="
echo "Файл: $METRICS_FILE"
echo ""

# Проверка наличия jq
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq не установлен. Установите: sudo apt install jq"
    echo ""
    echo "Базовый анализ без jq:"
    echo "Количество записей: $(wc -l < "$METRICS_FILE")"
    exit 0
fi

# Количество записей
TOTAL_LINES=$(wc -l < "$METRICS_FILE")
echo "📊 Всего записей: $TOTAL_LINES"
echo ""

# Последние 10 записей
echo "📋 Последние 10 записей:"
echo "-----------------------------------"
tail -n 10 "$METRICS_FILE" | jq -r '"[\(.timestamp)] Исходящий: \(.networkBytesOut) байт, Входящий: \(.networkBytesIn) байт, HTTP: \(.httpRequestsTotal), Redis: \(.redisSubscriptions)"' | while IFS= read -r line; do
    echo "  $line"
done
echo ""

# Общая статистика
echo "📈 Общая статистика:"
echo "-----------------------------------"

TOTAL_OUT=$(cat "$METRICS_FILE" | jq -s 'map(.networkBytesOut) | add')
TOTAL_IN=$(cat "$METRICS_FILE" | jq -s 'map(.networkBytesIn) | add')
MAX_OUT=$(cat "$METRICS_FILE" | jq -s 'map(.networkBytesOut) | max')
MAX_IN=$(cat "$METRICS_FILE" | jq -s 'map(.networkBytesIn) | max')
AVG_OUT=$(cat "$METRICS_FILE" | jq -s 'map(.networkBytesOut) | add / length')
AVG_IN=$(cat "$METRICS_FILE" | jq -s 'map(.networkBytesIn) | add / length')
TOTAL_HTTP=$(cat "$METRICS_FILE" | jq -s 'map(.httpRequestsTotal) | add')
MAX_REDIS=$(cat "$METRICS_FILE" | jq -s 'map(.redisSubscriptions) | max')
TOTAL_RECONNECTS=$(cat "$METRICS_FILE" | jq -s 'map(.discordReconnects) | add')

echo "  Всего исходящего трафика: $(format_bytes ${TOTAL_OUT%.*})"
echo "  Всего входящего трафика: $(format_bytes ${TOTAL_IN%.*})"
echo "  Максимум исходящего: $(format_bytes ${MAX_OUT%.*})"
echo "  Максимум входящего: $(format_bytes ${MAX_IN%.*})"
echo "  Средний исходящий: $(format_bytes ${AVG_OUT%.*})"
echo "  Средний входящий: $(format_bytes ${AVG_IN%.*})"
echo "  Всего HTTP запросов: ${TOTAL_HTTP%.*}"
echo "  Максимум Redis подписок: ${MAX_REDIS%.*}"
echo "  Всего Discord переподключений: ${TOTAL_RECONNECTS%.*}"
echo ""

# Первая и последняя запись
FIRST_TIMESTAMP=$(head -n 1 "$METRICS_FILE" | jq -r '.timestamp')
LAST_TIMESTAMP=$(tail -n 1 "$METRICS_FILE" | jq -r '.timestamp')
echo "⏰ Период:"
echo "  Начало: $FIRST_TIMESTAMP"
echo "  Конец: $LAST_TIMESTAMP"
echo ""

# Записи с высоким трафиком (> 100 MB)
echo "🔍 Записи с высоким трафиком (> 100 MB):"
echo "-----------------------------------"
HIGH_TRAFFIC=$(cat "$METRICS_FILE" | jq -c 'select(.networkBytesOut > 104857600 or .networkBytesIn > 104857600)')
if [ -z "$HIGH_TRAFFIC" ]; then
    echo "  Не найдено"
else
    echo "$HIGH_TRAFFIC" | jq -r '"[\(.timestamp)] Исходящий: \(.networkBytesOut) байт, Входящий: \(.networkBytesIn) байт"'
fi
echo ""

# Статистика по часам (если есть данные за разные часы)
echo "📅 Статистика по часам (последние 24 часа):"
echo "-----------------------------------"
cat "$METRICS_FILE" | jq -r '.timestamp' | while read -r timestamp; do
    hour=$(echo "$timestamp" | cut -d'T' -f2 | cut -d':' -f1)
    echo "  $hour:00"
done | sort | uniq -c | tail -24
echo ""

echo "=========================================="

