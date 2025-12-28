#!/bin/bash

# Скрипт для анализа логов Nginx
# Помогает найти источники трафика через HTTP запросы

echo "=========================================="
echo "Анализ логов Nginx"
echo "=========================================="
echo ""

if ! docker ps --format "{{.Names}}" | grep -q rnr_racing_nginx; then
    echo "Контейнер Nginx не запущен"
    exit 1
fi

NGINX_CONTAINER=$(docker ps --format "{{.Names}}" | grep rnr_racing_nginx | head -1)

echo "Анализ контейнера: $NGINX_CONTAINER"
echo ""

# 1. Топ IP адресов по количеству запросов
echo "1. ТОП 20 IP адресов по количеству запросов (за последний час):"
echo "-----------------------------------"
docker logs --since 1h $NGINX_CONTAINER 2>&1 | grep -oE "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" | sort | uniq -c | sort -rn | head -20 || echo "Логи не найдены"
echo ""

# 2. Топ запросов по методам
echo "2. Распределение по HTTP методам:"
echo "-----------------------------------"
docker logs --since 1h $NGINX_CONTAINER 2>&1 | grep -oE "\"GET|\"POST|\"PUT|\"DELETE|\"PATCH" | sort | uniq -c | sort -rn || echo "Не найдено"
echo ""

# 3. Топ URL по количеству запросов
echo "3. ТОП 20 URL по количеству запросов:"
echo "-----------------------------------"
docker logs --since 1h $NGINX_CONTAINER 2>&1 | grep -oE '"(GET|POST|PUT|DELETE|PATCH) [^"]*' | cut -d' ' -f2 | sort | uniq -c | sort -rn | head -20 || echo "Не найдено"
echo ""

# 4. Коды ответов
echo "4. Распределение по кодам ответа:"
echo "-----------------------------------"
docker logs --since 1h $NGINX_CONTAINER 2>&1 | grep -oE 'HTTP/[0-9.]+" [0-9]{3}' | cut -d' ' -f2 | sort | uniq -c | sort -rn || echo "Не найдено"
echo ""

# 5. Размер ответов (если есть в логах)
echo "5. Общее количество запросов за последний час:"
echo "-----------------------------------"
TOTAL_REQUESTS=$(docker logs --since 1h $NGINX_CONTAINER 2>&1 | grep -c "GET\|POST\|PUT\|DELETE" || echo "0")
echo "Всего запросов: $TOTAL_REQUESTS"
echo ""

# 6. Поиск подозрительных паттернов
echo "6. Поиск подозрительных паттернов:"
echo "-----------------------------------"
echo "Запросы с большим размером ответа (если доступно):"
docker logs --since 1h $NGINX_CONTAINER 2>&1 | grep -E "[0-9]{6,}" | head -20 || echo "Данные о размере не найдены"
echo ""

# 7. Поиск ботов и скраперов
echo "7. Поиск подозрительных User-Agent:"
echo "-----------------------------------"
docker logs --since 1h $NGINX_CONTAINER 2>&1 | grep -oE '"Mozilla[^"]*' | sort | uniq -c | sort -rn | head -10 || echo "Не найдено"
echo ""

# 8. Рекомендации
echo "=========================================="
echo "Рекомендации:"
echo "=========================================="
echo ""
echo "Для детального анализа сохраните логи:"
echo "  docker logs $NGINX_CONTAINER > /tmp/nginx_logs.txt"
echo ""
echo "Для мониторинга в реальном времени:"
echo "  docker logs -f $NGINX_CONTAINER | grep -E 'GET|POST'"
echo ""
echo "Для анализа размеров ответов добавьте в nginx.conf:"
echo "  log_format detailed '\$remote_addr - \$remote_user [\$time_local] \"\$request\" \$status \$body_bytes_sent \"\$http_referer\" \"\$http_user_agent\"';"
echo ""

