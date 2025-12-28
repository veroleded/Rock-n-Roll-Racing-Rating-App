#!/bin/bash

# Скрипт для мониторинга трафика приложения
# Использование: ./monitor-traffic.sh [URL]
# По умолчанию: http://localhost:3000

METRICS_URL="${1:-http://localhost:3000/api/metrics}"

# Функция для форматирования байтов
format_bytes() {
    local bytes=$1
    if [ -z "$bytes" ] || [ "$bytes" = "0" ]; then
        echo "0 B"
        return
    fi
    
    # Убираем дробную часть если есть
    bytes=${bytes%.*}
    
    if [ $bytes -ge 1073741824 ]; then
        local gb=$((bytes / 1073741824))
        local mb=$(((bytes % 1073741824) / 1048576))
        if [ $mb -gt 0 ]; then
            echo "${gb}.${mb} GB"
        else
            echo "${gb} GB"
        fi
    elif [ $bytes -ge 1048576 ]; then
        local mb=$((bytes / 1048576))
        local kb=$(((bytes % 1048576) / 1024))
        if [ $kb -gt 0 ]; then
            echo "${mb}.${kb} MB"
        else
            echo "${mb} MB"
        fi
    elif [ $bytes -ge 1024 ]; then
        local kb=$((bytes / 1024))
        echo "${kb} KB"
    else
        echo "${bytes} B"
    fi
}

# Получаем метрики
get_metrics() {
    curl -s "$METRICS_URL" 2>/dev/null
}

# Извлекаем значение метрики
get_metric_value() {
    local metric_name=$1
    get_metrics | grep "^${metric_name}" | awk '{print $2}' | head -1
}

echo "=========================================="
echo "  Мониторинг трафика приложения"
echo "=========================================="
echo "URL: $METRICS_URL"
echo "Время: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Получаем метрики
METRICS=$(get_metrics)

if [ -z "$METRICS" ]; then
    echo "❌ Ошибка: Не удалось получить метрики"
    echo "Проверьте, что приложение запущено и доступно по адресу: $METRICS_URL"
    exit 1
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

# HTTP запросы
HTTP_REQUESTS=$(echo "$METRICS" | grep "^http_requests_total{" | wc -l | tr -d ' ')

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

echo "📊 СЕТЕВОЙ ТРАФИК:"
BYTES_OUT_INT=${BYTES_OUT%.*}
BYTES_IN_INT=${BYTES_IN%.*}
echo "   Исходящий: $(format_bytes $BYTES_OUT_INT)"
echo "   Входящий:  $(format_bytes $BYTES_IN_INT)"
echo ""

echo "📈 HTTP ЗАПРОСЫ:"
echo "   Всего уникальных маршрутов: $HTTP_REQUESTS"
echo ""

echo "🔴 REDIS:"
echo "   Активных подписок: $REDIS_SUBS"
echo ""

echo "🤖 DISCORD:"
echo "   Переподключений: $DISCORD_RECONNECTS"
echo ""

# Предупреждение о высоком трафике (1 GB = 1073741824 байт)
# Используем awk для сравнения больших чисел
HIGH_TRAFFIC_THRESHOLD=1073741824
CRITICAL_TRAFFIC_THRESHOLD=10737418240  # 10 GB

if [ ! -z "$BYTES_OUT" ] && [ "$BYTES_OUT" != "0" ]; then
    # Сравниваем через awk для поддержки больших чисел
    TRAFFIC_CHECK=$(echo "$BYTES_OUT $CRITICAL_TRAFFIC_THRESHOLD" | awk '{if ($1 > $2) print "critical"; else if ($1 > 1073741824) print "high"; else print "ok"}')
    
    if [ "$TRAFFIC_CHECK" = "critical" ]; then
        echo "⚠️  КРИТИЧЕСКОЕ ВНИМАНИЕ: Обнаружен очень высокий исходящий трафик (> 10 GB)!"
        echo "   Немедленно остановите приложение и проверьте логи!"
    elif [ "$TRAFFIC_CHECK" = "high" ]; then
        echo "⚠️  ВНИМАНИЕ: Исходящий трафик превышает 1 GB"
        echo "   Рекомендуется проверить логи и метрики."
    fi
fi

# Проверка множественных подписок Redis
if [ $REDIS_SUBS -gt 5 ]; then
    echo "⚠️  ВНИМАНИЕ: Обнаружено множество подписок Redis ($REDIS_SUBS)"
    echo "   Возможна утечка подписок!"
fi

# Проверка множественных переподключений Discord
if [ $DISCORD_RECONNECTS -gt 10 ]; then
    echo "⚠️  ВНИМАНИЕ: Множественные переподключения Discord ($DISCORD_RECONNECTS)"
    echo "   Возможны проблемы с соединением!"
fi

echo ""
echo "=========================================="

