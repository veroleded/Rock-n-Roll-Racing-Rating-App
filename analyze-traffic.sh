#!/bin/bash

# Скрипт для анализа трафика и логов на сервере
# Использование: ./analyze-traffic.sh

set -e

echo "=========================================="
echo "Анализ трафика и логов сервера"
echo "=========================================="
echo ""

# Цвета для вывода
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

# Проверка 1: Статус контейнеров
echo "1. Проверка статуса контейнеров:"
echo "-----------------------------------"
docker ps -a --filter "name=rnr_racing" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" || true
echo ""

# Проверка 2: Использование ресурсов контейнерами
echo "2. Использование ресурсов контейнерами (CPU, память, сеть):"
echo "-----------------------------------"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $(docker ps -q --filter "name=rnr_racing") 2>/dev/null || echo "Контейнеры не запущены"
echo ""

# Проверка 3: Сетевая активность через Docker
echo "3. Сетевая активность контейнеров (последние 5 минут):"
echo "-----------------------------------"
if command -v docker &> /dev/null; then
    for container in $(docker ps --format "{{.Names}}" --filter "name=rnr_racing"); do
        echo "Контейнер: $container"
        docker exec $container sh -c "cat /proc/net/sockstat 2>/dev/null || echo 'Статистика недоступна'" 2>/dev/null || true
        echo ""
    done
else
    echo "Docker не установлен или недоступен"
fi
echo ""

# Проверка 4: Логи приложения на подозрительную активность
echo "4. Анализ логов приложения (поиск подозрительной активности):"
echo "-----------------------------------"

if docker ps --format "{{.Names}}" | grep -q rnr_racing_app; then
    APP_CONTAINER=$(docker ps --format "{{.Names}}" | grep rnr_racing_app | head -1)
    
    echo "4.1. Поиск множественных подписок Redis:"
    docker logs $APP_CONTAINER 2>&1 | grep -i "redis.*подписан\|redis.*subscribe" | tail -20 || echo "Не найдено"
    echo ""
    
    echo "4.2. Поиск ошибок переподключения Discord:"
    docker logs $APP_CONTAINER 2>&1 | grep -i "discord.*error\|discord.*reconnect\|discord.*disconnect" | tail -20 || echo "Не найдено"
    echo ""
    
    echo "4.3. Поиск множественных запусков бота:"
    docker logs $APP_CONTAINER 2>&1 | grep -i "bot.*готов\|bot.*singleton\|защита.*запуска" | tail -20 || echo "Не найдено"
    echo ""
    
    echo "4.4. Подсчет количества подписок Redis (должно быть мало):"
    REDIS_SUBS=$(docker logs $APP_CONTAINER 2>&1 | grep -c "Подписан на события" || echo "0")
    echo "Найдено записей о подписках: $REDIS_SUBS"
    if [ "$REDIS_SUBS" -gt 10 ]; then
        warn "Подозрительно много подписок! Возможна утечка."
    fi
    echo ""
    
    echo "4.5. Поиск HTTP запросов (могут быть причиной трафика):"
    docker logs $APP_CONTAINER 2>&1 | grep -iE "GET|POST|PUT|DELETE|PATCH" | tail -30 || echo "Не найдено"
    echo ""
    
    echo "4.6. Поиск ошибок и предупреждений:"
    docker logs $APP_CONTAINER 2>&1 | grep -iE "error|warning|exception|failed" | tail -30 || echo "Не найдено"
    echo ""
else
    warn "Контейнер приложения не запущен"
fi

# Проверка 5: Системная сетевая статистика
echo "5. Системная сетевая статистика:"
echo "-----------------------------------"
if [ -f /proc/net/sockstat ]; then
    echo "Сокеты:"
    cat /proc/net/sockstat
    echo ""
fi

if [ -f /proc/net/netstat ]; then
    echo "TCP статистика:"
    cat /proc/net/netstat | grep -i tcp | head -5
    echo ""
fi

# Проверка 6: Активные сетевые соединения
echo "6. Активные сетевые соединения (TOP 10 по активности):"
echo "-----------------------------------"
if command -v ss &> /dev/null; then
    ss -tnp 2>/dev/null | head -15 || netstat -tnp 2>/dev/null | head -15 || echo "Инструменты недоступны"
else
    netstat -tnp 2>/dev/null | head -15 || echo "Инструменты недоступны"
fi
echo ""

# Проверка 7: Использование трафика интерфейсами (если доступно)
echo "7. Статистика сетевых интерфейсов:"
echo "-----------------------------------"
if [ -f /proc/net/dev ]; then
    cat /proc/net/dev | grep -E "eth0|ens|enp|wlan" || cat /proc/net/dev | head -5
    echo ""
    echo "Для сравнения с предыдущим состоянием сохраните вывод:"
    echo "  cat /proc/net/dev > /tmp/net_dev_before.txt"
    echo "  # подождите 5 минут"
    echo "  cat /proc/net/dev > /tmp/net_dev_after.txt"
    echo "  diff /tmp/net_dev_before.txt /tmp/net_dev_after.txt"
else
    echo "Файл /proc/net/dev недоступен"
fi
echo ""

# Проверка 8: Redis соединения
echo "8. Активные соединения с Redis:"
echo "-----------------------------------"
if docker ps --format "{{.Names}}" | grep -q rnr_racing_redis; then
    REDIS_CONTAINER=$(docker ps --format "{{.Names}}" | grep rnr_racing_redis | head -1)
    docker exec $REDIS_CONTAINER redis-cli INFO clients 2>/dev/null | grep -E "connected_clients|blocked_clients" || echo "Не удалось получить информацию"
else
    echo "Контейнер Redis не запущен"
fi
echo ""

# Проверка 9: PostgreSQL соединения
echo "9. Активные соединения с PostgreSQL:"
echo "-----------------------------------"
if docker ps --format "{{.Names}}" | grep -q rnr_racing_db; then
    DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep rnr_racing_db | head -1)
    docker exec $DB_CONTAINER psql -U postgres -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null || echo "Не удалось получить информацию"
else
    echo "Контейнер базы данных не запущен"
fi
echo ""

# Проверка 10: Рекомендации по установке инструментов мониторинга
echo "10. Рекомендации для детального мониторинга:"
echo "-----------------------------------"
echo "Для детального анализа трафика установите:"
echo ""
echo "  # Установка iftop (мониторинг трафика в реальном времени)"
echo "  sudo apt update && sudo apt install -y iftop"
echo "  sudo iftop -i eth0"
echo ""
echo "  # Установка nethogs (трафик по процессам)"
echo "  sudo apt install -y nethogs"
echo "  sudo nethogs"
echo ""
echo "  # Установка vnstat (статистика трафика)"
echo "  sudo apt install -y vnstat"
echo "  sudo vnstat -i eth0"
echo ""
echo "  # Мониторинг через tcpdump (детальный анализ пакетов)"
echo "  sudo apt install -y tcpdump"
echo "  sudo tcpdump -i eth0 -n 'port 443 or port 80' -c 100"
echo ""

# Проверка 11: Анализ логов за последний час
echo "11. Анализ логов за последний час (если контейнер запущен):"
echo "-----------------------------------"
if docker ps --format "{{.Names}}" | grep -q rnr_racing_app; then
    APP_CONTAINER=$(docker ps --format "{{.Names}}" | grep rnr_racing_app | head -1)
    
    echo "Частота событий Redis:"
    docker logs --since 1h $APP_CONTAINER 2>&1 | grep -c "Получено событие" || echo "0"
    echo ""
    
    echo "Частота ошибок:"
    docker logs --since 1h $APP_CONTAINER 2>&1 | grep -ci "error" || echo "0"
    echo ""
    
    echo "Частота переподключений:"
    docker logs --since 1h $APP_CONTAINER 2>&1 | grep -ci "reconnect\|disconnect" || echo "0"
    echo ""
else
    echo "Контейнер не запущен"
fi

echo ""
echo "=========================================="
echo "Анализ завершен"
echo "=========================================="
echo ""
warn "ВАЖНО: Если обнаружена высокая активность, проверьте логи детально:"
echo "  docker logs rnr_racing_app_bogdan > /tmp/app_logs.txt"
echo "  docker logs rnr_racing_nginx_bogdan > /tmp/nginx_logs.txt"
echo ""

