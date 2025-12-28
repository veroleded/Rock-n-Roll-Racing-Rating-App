#!/bin/bash

# Скрипт для анализа исторических логов сервера
# Помогает понять, что происходило в конкретный период времени

set -e

# Параметры по умолчанию
DAYS_AGO=${1:-1}  # По умолчанию вчера (1 день назад)
DATE_STR=$(date -d "$DAYS_AGO days ago" +"%Y-%m-%d" 2>/dev/null || date -v-${DAYS_AGO}d +"%Y-%m-%d" 2>/dev/null || date +"%Y-%m-%d")

echo "=========================================="
echo "Анализ исторических логов сервера"
echo "Дата: $DATE_STR (${DAYS_AGO} день(ей) назад)"
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

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Функция для получения временного диапазона
get_date_range() {
    local days_ago=$1
    local start_date=$(date -d "$days_ago days ago 00:00" +"%Y-%m-%d %H:%M:%S" 2>/dev/null || date -v-${days_ago}d -v0H -v0M -v0S +"%Y-%m-%d %H:%M:%S" 2>/dev/null || date +"%Y-%m-%d 00:00:00")
    local end_date=$(date -d "$days_ago days ago 23:59" +"%Y-%m-%d %H:%M:%S" 2>/dev/null || date -v-${days_ago}d -v23H -v59M -v59S +"%Y-%m-%d %H:%M:%S" 2>/dev/null || date +"%Y-%m-%d 23:59:59")
    echo "$start_date|$end_date"
}

DATE_RANGE=$(get_date_range $DAYS_AGO)
START_DATE=$(echo $DATE_RANGE | cut -d'|' -f1)
END_DATE=$(echo $DATE_RANGE | cut -d'|' -f2)

info "Период анализа: $START_DATE - $END_DATE"
echo ""

# 1. Системные логи через journalctl
echo "1. Системные логи за $DATE_STR:"
echo "-----------------------------------"
if command -v journalctl &> /dev/null; then
    info "Анализ journalctl..."
    
    echo "1.1. Ошибки и предупреждения системы:"
    sudo journalctl --since "$START_DATE" --until "$END_DATE" -p err -o short-iso | head -50 || echo "Логи не найдены или период недоступен"
    echo ""
    
    echo "1.2. События Docker за этот период:"
    sudo journalctl --since "$START_DATE" --until "$END_DATE" -u docker -o short-iso | tail -50 || echo "Логи Docker не найдены"
    echo ""
    
    echo "1.3. Сетевые события:"
    sudo journalctl --since "$START_DATE" --until "$END_DATE" | grep -iE "network|interface|eth0|ens" | tail -30 || echo "Сетевые события не найдены"
    echo ""
else
    warn "journalctl не доступен. Проверьте системные логи через /var/log/"
fi

# 2. Логи Docker контейнеров за период
echo "2. Логи Docker контейнеров за $DATE_STR:"
echo "-----------------------------------"

if docker ps -a --format "{{.Names}}" | grep -q rnr_racing; then
    info "Анализ логов Docker контейнеров..."
    
    for container in $(docker ps -a --format "{{.Names}}" | grep rnr_racing); do
        echo "2.1. Контейнер: $container"
        echo "Последние записи за $DATE_STR:"
        docker logs --since "$START_DATE" --until "$END_DATE" "$container" 2>&1 | tail -100 || echo "Логи не найдены для этого периода"
        echo ""
    done
else
    warn "Контейнеры не найдены. Проверьте, были ли они запущены в этот период."
fi

# 3. Логи Nginx (если сохраняются на диске)
echo "3. Логи Nginx с диска (если доступны):"
echo "-----------------------------------"
if [ -f /var/log/nginx/access.log ]; then
    info "Анализ /var/log/nginx/access.log..."
    
    echo "3.1. Общее количество запросов:"
    grep "$DATE_STR" /var/log/nginx/access.log 2>/dev/null | wc -l || echo "0"
    echo ""
    
    echo "3.2. ТОП 20 IP адресов:"
    grep "$DATE_STR" /var/log/nginx/access.log 2>/dev/null | grep -oE "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" | sort | uniq -c | sort -rn | head -20 || echo "Не найдено"
    echo ""
    
    echo "3.3. ТОП 20 URL:"
    grep "$DATE_STR" /var/log/nginx/access.log 2>/dev/null | grep -oE '"(GET|POST|PUT|DELETE|PATCH) [^"]*' | cut -d' ' -f2 | sort | uniq -c | sort -rn | head -20 || echo "Не найдено"
    echo ""
    
    echo "3.4. Коды ответа:"
    grep "$DATE_STR" /var/log/nginx/access.log 2>/dev/null | grep -oE 'HTTP/[0-9.]+" [0-9]{3}' | cut -d' ' -f2 | sort | uniq -c | sort -rn || echo "Не найдено"
    echo ""
else
    warn "Файл /var/log/nginx/access.log не найден. Логи могут быть только в Docker."
fi

if [ -f /var/log/nginx/error.log ]; then
    echo "3.5. Ошибки Nginx:"
    grep "$DATE_STR" /var/log/nginx/error.log 2>/dev/null | tail -50 || echo "Ошибок не найдено"
    echo ""
fi

# 4. Логи авторизации (проверка подозрительных входов)
echo "4. Логи авторизации за $DATE_STR:"
echo "-----------------------------------"
if [ -f /var/log/auth.log ]; then
    info "Анализ /var/log/auth.log..."
    
    echo "4.1. Попытки входа:"
    grep "$DATE_STR" /var/log/auth.log 2>/dev/null | grep -i "login\|ssh\|su" | tail -30 || echo "Не найдено"
    echo ""
    
    echo "4.2. Неудачные попытки входа:"
    grep "$DATE_STR" /var/log/auth.log 2>/dev/null | grep -i "failed\|invalid" | tail -30 || echo "Не найдено"
    echo ""
elif [ -f /var/log/secure ]; then
    info "Анализ /var/log/secure (RedHat/CentOS)..."
    grep "$DATE_STR" /var/log/secure 2>/dev/null | tail -30 || echo "Не найдено"
    echo ""
else
    warn "Логи авторизации не найдены в стандартных местах"
fi

# 5. Системные логи (syslog, messages)
echo "5. Общие системные логи:"
echo "-----------------------------------"
if [ -f /var/log/syslog ]; then
    echo "5.1. /var/log/syslog за $DATE_STR:"
    grep "$DATE_STR" /var/log/syslog 2>/dev/null | tail -50 || echo "Не найдено"
    echo ""
fi

if [ -f /var/log/messages ]; then
    echo "5.2. /var/log/messages за $DATE_STR:"
    grep "$DATE_STR" /var/log/messages 2>/dev/null | tail -50 || echo "Не найдено"
    echo ""
fi

# 6. Логи Docker daemon
echo "6. Логи Docker daemon:"
echo "-----------------------------------"
if [ -f /var/log/docker.log ] || [ -f /var/log/docker/docker.log ]; then
    info "Анализ логов Docker daemon..."
    DOCKER_LOG=$(find /var/log -name "*docker*.log" -type f 2>/dev/null | head -1)
    if [ -n "$DOCKER_LOG" ]; then
        grep "$DATE_STR" "$DOCKER_LOG" 2>/dev/null | tail -50 || echo "Не найдено"
    fi
    echo ""
fi

# 7. Проверка использования диска для логов
echo "7. Информация о логах:"
echo "-----------------------------------"
echo "Размеры лог-файлов:"
du -h /var/log/*.log 2>/dev/null | sort -h | tail -10 || echo "Не удалось получить информацию"
echo ""

# 8. Рекомендации
echo "=========================================="
echo "Рекомендации для детального анализа:"
echo "=========================================="
echo ""
echo "1. Сохраните все логи за период в файлы:"
echo "   sudo journalctl --since '$START_DATE' --until '$END_DATE' > /tmp/system_logs_$DATE_STR.txt"
echo "   docker logs --since '$START_DATE' --until '$END_DATE' rnr_racing_app_bogdan > /tmp/docker_app_$DATE_STR.txt"
echo ""
echo "2. Анализ конкретного времени (например, 20:00-22:00):"
echo "   sudo journalctl --since '${DATE_STR} 20:00:00' --until '${DATE_STR} 22:00:00'"
echo ""
echo "3. Поиск конкретных событий:"
echo "   sudo journalctl --since '$START_DATE' --until '$END_DATE' | grep -i 'error\|warning\|network'"
echo ""
echo "4. Проверка ротации логов:"
echo "   ls -lh /var/log/nginx/*.log*"
echo "   ls -lh /var/log/*.log.*.gz"
echo ""
echo "5. Если логов нет в journalctl, проверьте старые архивы:"
echo "   sudo journalctl --since '$START_DATE' --until '$END_DATE' --list-boots"
echo ""

