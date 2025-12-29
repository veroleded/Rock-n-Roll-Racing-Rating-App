#!/bin/bash

# Скрипт для анализа атак и подозрительных запросов в логах Nginx
# Использование: ./scripts/analysis/analyze-nginx-attacks.sh [количество дней]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

DAYS="${1:-1}"
LOG_FILE="${2:-/var/log/nginx/access.log}"

echo "=========================================="
echo "  Анализ атак в логах Nginx"
echo "=========================================="
echo "Период: последние $DAYS день(дней)"
echo "Лог файл: $LOG_FILE"
echo ""

# Проверяем, существует ли файл лога
if [ ! -f "$LOG_FILE" ]; then
    echo "❌ Файл лога не найден: $LOG_FILE"
    echo ""
    echo "Попробуйте указать путь к логу в Docker контейнере:"
    echo "  docker exec rnr_racing_nginx_bogdan cat /var/log/nginx/access.log | ./scripts/analysis/analyze-nginx-attacks.sh $DAYS"
    exit 1
fi

# Функция для анализа логов
analyze_logs() {
    local log_content="$1"
    
    echo "📊 1. ТОП IP АДРЕСОВ ПО КОЛИЧЕСТВУ ЗАПРОСОВ"
    echo "----------------------------------------"
    echo "$log_content" | awk '{print $1}' | sort | uniq -c | sort -rn | head -20 | \
        while read count ip; do
            # Проверяем, является ли IP подозрительным
            if [[ "$ip" =~ ^104\.(23|219)\. ]] || [[ "$ip" =~ ^172\.70\. ]] || [[ "$ip" =~ ^43\.(130|153|154|157)\. ]]; then
                echo "   ⚠️  $ip: $count запросов (подозрительный IP)"
            else
                echo "   $ip: $count запросов"
            fi
        done
    
    echo ""
    echo "📋 2. ТОП ЗАПРОСОВ ПО ПУТЯМ"
    echo "----------------------------------------"
    echo "$log_content" | awk '{print $7}' | sort | uniq -c | sort -rn | head -20 | \
        while read count path; do
            # Проверяем подозрительные пути
            if [[ "$path" =~ (wp-admin|wp-content|wordpress|phpmyadmin|admin|\.php|\.asp|\.jsp) ]]; then
                echo "   ⚠️  $path: $count запросов (подозрительный путь)"
            else
                echo "   $path: $count запросов"
            fi
        done
    
    echo ""
    echo "🔍 3. ПОДОЗРИТЕЛЬНЫЕ ЗАПРОСЫ"
    echo "----------------------------------------"
    
    # WordPress сканеры
    WP_REQUESTS=$(echo "$log_content" | grep -cE "(wp-admin|wp-content|wordpress|xmlrpc)" || echo "0")
    if [ "$WP_REQUESTS" -gt 0 ]; then
        echo "   ⚠️  WordPress сканеры: $WP_REQUESTS запросов"
        echo "$log_content" | grep -E "(wp-admin|wp-content|wordpress|xmlrpc)" | \
            awk '{print $1, $7}' | sort | uniq -c | sort -rn | head -10 | \
            while read count ip path; do
                echo "      $ip -> $path ($count раз)"
            done
    else
        echo "   ✅ WordPress сканеры не обнаружены"
    fi
    
    echo ""
    
    # PHP/ASP сканеры
    PHP_REQUESTS=$(echo "$log_content" | grep -cE "\.(php|asp|aspx|jsp)" || echo "0")
    if [ "$PHP_REQUESTS" -gt 0 ]; then
        echo "   ⚠️  PHP/ASP сканеры: $PHP_REQUESTS запросов"
        echo "$log_content" | grep -E "\.(php|asp|aspx|jsp)" | \
            awk '{print $1, $7}' | sort | uniq -c | sort -rn | head -10 | \
            while read count ip path; do
                echo "      $ip -> $path ($count раз)"
            done
    else
        echo "   ✅ PHP/ASP сканеры не обнаружены"
    fi
    
    echo ""
    
    # Админ панели
    ADMIN_REQUESTS=$(echo "$log_content" | grep -cE "(admin|administrator|phpmyadmin|mysql)" || echo "0")
    if [ "$ADMIN_REQUESTS" -gt 0 ]; then
        echo "   ⚠️  Сканеры админ панелей: $ADMIN_REQUESTS запросов"
        echo "$log_content" | grep -E "(admin|administrator|phpmyadmin|mysql)" | \
            awk '{print $1, $7}' | sort | uniq -c | sort -rn | head -10 | \
            while read count ip path; do
                echo "      $ip -> $path ($count раз)"
            done
    else
        echo "   ✅ Сканеры админ панелей не обнаружены"
    fi
    
    echo ""
    echo "📈 4. СТАТИСТИКА"
    echo "----------------------------------------"
    TOTAL_REQUESTS=$(echo "$log_content" | wc -l)
    UNIQUE_IPS=$(echo "$log_content" | awk '{print $1}' | sort -u | wc -l)
    SUSPICIOUS_REQUESTS=$(echo "$log_content" | grep -cE "(wp-admin|wp-content|wordpress|\.php|\.asp|admin|phpmyadmin)" || echo "0")
    
    echo "   Всего запросов: $TOTAL_REQUESTS"
    echo "   Уникальных IP: $UNIQUE_IPS"
    echo "   Подозрительных запросов: $SUSPICIOUS_REQUESTS"
    
    if [ "$SUSPICIOUS_REQUESTS" -gt 0 ]; then
        PERCENTAGE=$(echo "scale=2; $SUSPICIOUS_REQUESTS * 100 / $TOTAL_REQUESTS" | bc)
        echo "   Процент подозрительных: ${PERCENTAGE}%"
    fi
}

# Получаем логи за указанный период
if [ -f "$LOG_FILE" ]; then
    # Если файл существует локально
    if [ "$DAYS" -eq 1 ]; then
        LOG_CONTENT=$(tail -1000 "$LOG_FILE" 2>/dev/null || echo "")
    else
        # Для нескольких дней используем find
        LOG_CONTENT=$(find "$(dirname "$LOG_FILE")" -name "$(basename "$LOG_FILE")*" -mtime -$DAYS -exec cat {} \; 2>/dev/null || echo "")
    fi
    
    if [ -z "$LOG_CONTENT" ]; then
        echo "⚠️  Не удалось прочитать логи из файла"
        echo ""
        echo "Попробуйте получить логи из Docker контейнера:"
        echo "  docker logs --since ${DAYS}d rnr_racing_nginx_bogdan | ./scripts/analysis/analyze-nginx-attacks.sh $DAYS"
        exit 1
    fi
    
    analyze_logs "$LOG_CONTENT"
else
    echo "❌ Файл лога не найден: $LOG_FILE"
    echo ""
    echo "Для анализа логов из Docker контейнера используйте:"
    echo "  docker logs --since ${DAYS}d rnr_racing_nginx_bogdan > /tmp/nginx.log"
    echo "  ./scripts/analysis/analyze-nginx-attacks.sh $DAYS /tmp/nginx.log"
fi

echo ""
echo "💡 РЕКОМЕНДАЦИИ"
echo "----------------------------------------"
echo "1. Если обнаружены подозрительные запросы, они уже заблокированы в nginx.bogdan.conf"
echo "2. Проверьте, что rate limiting активен"
echo "3. Рассмотрите возможность использования fail2ban для автоматической блокировки"
echo "4. Мониторьте логи регулярно: ./scripts/analysis/analyze-nginx-attacks.sh"

