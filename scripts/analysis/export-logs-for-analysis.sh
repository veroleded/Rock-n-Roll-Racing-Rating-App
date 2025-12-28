#!/bin/bash

# Скрипт для экспорта всех логов за период для детального анализа
# Использование: ./export-logs-for-analysis.sh [дней_назад]

set -e

DAYS_AGO=${1:-1}
DATE_STR=$(date -d "$DAYS_AGO days ago" +"%Y-%m-%d" 2>/dev/null || date -v-${DAYS_AGO}d +"%Y-%m-%d" 2>/dev/null || date +"%Y-%m-%d")
EXPORT_DIR="/tmp/logs_export_${DATE_STR}_$(date +%H%M%S)"

echo "=========================================="
echo "Экспорт логов для анализа"
echo "Дата: $DATE_STR"
echo "Директория: $EXPORT_DIR"
echo "=========================================="
echo ""

mkdir -p "$EXPORT_DIR"

info() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

warn() {
    echo -e "\033[1;33m[WARN]\033[0m $1"
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

# 1. Системные логи
info "Экспорт системных логов (journalctl)..."
if command -v journalctl &> /dev/null; then
    sudo journalctl --since "$START_DATE" --until "$END_DATE" > "$EXPORT_DIR/system_journalctl.txt" 2>&1 || warn "Не удалось экспортировать journalctl"
    sudo journalctl --since "$START_DATE" --until "$END_DATE" -p err > "$EXPORT_DIR/system_errors.txt" 2>&1 || warn "Не удалось экспортировать ошибки"
    info "✓ Системные логи экспортированы"
else
    warn "journalctl недоступен"
fi

# 2. Логи Docker контейнеров
info "Экспорт логов Docker контейнеров..."
if docker ps -a --format "{{.Names}}" | grep -q rnr_racing; then
    for container in $(docker ps -a --format "{{.Names}}" | grep rnr_racing); do
        info "  Экспорт логов $container..."
        docker logs --since "$START_DATE" --until "$END_DATE" "$container" > "$EXPORT_DIR/docker_${container}.txt" 2>&1 || warn "Не удалось экспортировать логи $container"
    done
    info "✓ Логи Docker контейнеров экспортированы"
else
    warn "Контейнеры не найдены"
fi

# 3. Логи Nginx с диска
info "Экспорт логов Nginx..."
if [ -f /var/log/nginx/access.log ]; then
    grep "$DATE_STR" /var/log/nginx/access.log > "$EXPORT_DIR/nginx_access.txt" 2>/dev/null || warn "Не удалось экспортировать access.log"
    info "✓ access.log экспортирован"
fi

if [ -f /var/log/nginx/error.log ]; then
    grep "$DATE_STR" /var/log/nginx/error.log > "$EXPORT_DIR/nginx_error.txt" 2>/dev/null || warn "Не удалось экспортировать error.log"
    info "✓ error.log экспортирован"
fi

# 4. Логи авторизации
info "Экспорт логов авторизации..."
if [ -f /var/log/auth.log ]; then
    grep "$DATE_STR" /var/log/auth.log > "$EXPORT_DIR/auth.log" 2>/dev/null || warn "Не удалось экспортировать auth.log"
    info "✓ auth.log экспортирован"
elif [ -f /var/log/secure ]; then
    grep "$DATE_STR" /var/log/secure > "$EXPORT_DIR/secure.log" 2>/dev/null || warn "Не удалось экспортировать secure.log"
    info "✓ secure.log экспортирован"
fi

# 5. Системные логи
if [ -f /var/log/syslog ]; then
    grep "$DATE_STR" /var/log/syslog > "$EXPORT_DIR/syslog.txt" 2>/dev/null || warn "Не удалось экспортировать syslog"
fi

if [ -f /var/log/messages ]; then
    grep "$DATE_STR" /var/log/messages > "$EXPORT_DIR/messages.txt" 2>/dev/null || warn "Не удалось экспортировать messages"
fi

# 6. Docker stats (текущее состояние)
info "Сохранение текущего состояния Docker..."
docker stats --no-stream > "$EXPORT_DIR/docker_stats_current.txt" 2>&1 || warn "Не удалось получить docker stats"

# 7. Системная информация
info "Сохранение системной информации..."
uname -a > "$EXPORT_DIR/system_info.txt" 2>&1
free -h >> "$EXPORT_DIR/system_info.txt" 2>&1
df -h >> "$EXPORT_DIR/system_info.txt" 2>&1

# 8. Создание сводки
info "Создание сводки..."
cat > "$EXPORT_DIR/README.txt" << EOF
Экспорт логов за $DATE_STR
Период: $START_DATE - $END_DATE
Дата экспорта: $(date)

Содержимое:
- system_journalctl.txt - Все системные логи через journalctl
- system_errors.txt - Только ошибки системы
- docker_*.txt - Логи каждого Docker контейнера
- nginx_access.txt - Логи доступа Nginx
- nginx_error.txt - Ошибки Nginx
- auth.log или secure.log - Логи авторизации
- syslog.txt - Системные логи (если доступны)
- messages.txt - Общие системные логи (если доступны)
- docker_stats_current.txt - Текущее состояние контейнеров
- system_info.txt - Системная информация

Для анализа используйте:
- grep -i "error\|warning" system_journalctl.txt | head -100
- grep -i "discord\|redis\|network" docker_*.txt | head -100
- cat nginx_access.txt | grep -oE "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" | sort | uniq -c | sort -rn | head -20
EOF

# Подсчет файлов
FILE_COUNT=$(find "$EXPORT_DIR" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$EXPORT_DIR" | cut -f1)

echo ""
echo "=========================================="
echo "Экспорт завершен"
echo "=========================================="
echo ""
info "Файлов экспортировано: $FILE_COUNT"
info "Общий размер: $TOTAL_SIZE"
info "Директория: $EXPORT_DIR"
echo ""
echo "Для анализа:"
echo "  cd $EXPORT_DIR"
echo "  cat README.txt"
echo ""
echo "Для архивации:"
echo "  tar -czf /tmp/logs_export_${DATE_STR}.tar.gz $EXPORT_DIR"
echo ""

