#!/bin/bash

# Скрипт для поиска подозрительной активности в логах
# Использование: ./check-suspicious-activity.sh

echo "=========================================="
echo "Поиск подозрительной активности в логах"
echo "=========================================="
echo ""

# Цвета
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

if ! docker ps --format "{{.Names}}" | grep -q rnr_racing_app; then
    echo -e "${RED}Контейнер приложения не запущен${NC}"
    exit 1
fi

APP_CONTAINER=$(docker ps --format "{{.Names}}" | grep rnr_racing_app | head -1)

echo "Анализ контейнера: $APP_CONTAINER"
echo ""

# 1. Множественные подписки Redis
echo -e "${YELLOW}1. Поиск множественных подписок Redis:${NC}"
REDIS_SUBS=$(docker logs $APP_CONTAINER 2>&1 | grep -c "Подписан на события" || echo "0")
echo "Общее количество записей о подписках: $REDIS_SUBS"

if [ "$REDIS_SUBS" -gt 5 ]; then
    echo -e "${RED}⚠️  ВНИМАНИЕ: Найдено $REDIS_SUBS подписок! Это может указывать на утечку.${NC}"
    echo "Детали:"
    docker logs $APP_CONTAINER 2>&1 | grep "Подписан на события" | tail -20
else
    echo -e "${GREEN}✓ Количество подписок нормальное${NC}"
fi
echo ""

# 2. Множественные запуски бота
echo -e "${YELLOW}2. Поиск множественных запусков бота:${NC}"
BOT_STARTS=$(docker logs $APP_CONTAINER 2>&1 | grep -c "Бот готов\|bot.*ready\|singleton" || echo "0")
echo "Количество запусков бота: $BOT_STARTS"

if [ "$BOT_STARTS" -gt 1 ]; then
    echo -e "${RED}⚠️  ВНИМАНИЕ: Бот запускался $BOT_STARTS раз(а)!${NC}"
    echo "Временные метки запусков:"
    docker logs $APP_CONTAINER 2>&1 | grep -i "бот готов\|bot.*ready" | tail -10
else
    echo -e "${GREEN}✓ Бот запускался только один раз${NC}"
fi
echo ""

# 3. Ошибки переподключения Discord
echo -e "${YELLOW}3. Поиск ошибок и переподключений Discord:${NC}"
DISCORD_ERRORS=$(docker logs $APP_CONTAINER 2>&1 | grep -ci "discord.*error\|discord.*reconnect\|discord.*disconnect" || echo "0")
echo "Количество ошибок/переподключений: $DISCORD_ERRORS"

if [ "$DISCORD_ERRORS" -gt 10 ]; then
    echo -e "${RED}⚠️  ВНИМАНИЕ: Найдено $DISCORD_ERRORS ошибок/переподключений!${NC}"
    echo "Последние ошибки:"
    docker logs $APP_CONTAINER 2>&1 | grep -i "discord.*error\|discord.*reconnect" | tail -20
else
    echo -e "${GREEN}✓ Количество ошибок в пределах нормы${NC}"
fi
echo ""

# 4. Частота событий Redis
echo -e "${YELLOW}4. Анализ частоты событий Redis:${NC}"
EVENTS_COUNT=$(docker logs --since 1h $APP_CONTAINER 2>&1 | grep -c "Получено событие" || echo "0")
echo "Событий за последний час: $EVENTS_COUNT"

if [ "$EVENTS_COUNT" -gt 1000 ]; then
    echo -e "${RED}⚠️  ВНИМАНИЕ: Очень много событий ($EVENTS_COUNT)! Возможна утечка.${NC}"
else
    echo -e "${GREEN}✓ Количество событий нормальное${NC}"
fi
echo ""

# 5. HTTP запросы
echo -e "${YELLOW}5. Поиск HTTP запросов (последние 50):${NC}"
HTTP_COUNT=$(docker logs --since 1h $APP_CONTAINER 2>&1 | grep -cE "GET|POST|PUT|DELETE" || echo "0")
echo "HTTP запросов за последний час: $HTTP_COUNT"

if [ "$HTTP_COUNT" -gt 10000 ]; then
    echo -e "${RED}⚠️  ВНИМАНИЕ: Очень много HTTP запросов!${NC}"
    echo "Топ доменов/IP:"
    docker logs --since 1h $APP_CONTAINER 2>&1 | grep -oE "GET|POST" | sort | uniq -c | sort -rn | head -10
else
    echo -e "${GREEN}✓ Количество запросов нормальное${NC}"
fi
echo ""

# 6. Ошибки в целом
echo -e "${YELLOW}6. Общая статистика ошибок:${NC}"
ERRORS_COUNT=$(docker logs --since 1h $APP_CONTAINER 2>&1 | grep -ci "error\|exception\|failed" || echo "0")
echo "Ошибок за последний час: $ERRORS_COUNT"

if [ "$ERRORS_COUNT" -gt 100 ]; then
    echo -e "${RED}⚠️  ВНИМАНИЕ: Много ошибок ($ERRORS_COUNT)!${NC}"
    echo "Топ ошибок:"
    docker logs --since 1h $APP_CONTAINER 2>&1 | grep -i "error\|exception" | cut -d':' -f2- | sort | uniq -c | sort -rn | head -10
else
    echo -e "${GREEN}✓ Количество ошибок нормальное${NC}"
fi
echo ""

# 7. Проверка процессов бота
echo -e "${YELLOW}7. Проверка процессов бота в контейнере:${NC}"
BOT_PROCESSES=$(docker exec $APP_CONTAINER sh -c "ps aux | grep -c 'tsx.*bot/index\|node.*bot'" || echo "0")
echo "Процессов бота: $BOT_PROCESSES"

if [ "$BOT_PROCESSES" -gt 2 ]; then
    echo -e "${RED}⚠️  ВНИМАНИЕ: Найдено $BOT_PROCESSES процессов бота! Должен быть только 1.${NC}"
    docker exec $APP_CONTAINER sh -c "ps aux | grep -E 'tsx.*bot|node.*bot'" || true
else
    echo -e "${GREEN}✓ Количество процессов нормальное${NC}"
fi
echo ""

# 8. Проверка Redis соединений
echo -e "${YELLOW}8. Проверка Redis соединений:${NC}"
if docker ps --format "{{.Names}}" | grep -q rnr_racing_redis; then
    REDIS_CONTAINER=$(docker ps --format "{{.Names}}" | grep rnr_racing_redis | head -1)
    CONNECTED_CLIENTS=$(docker exec $REDIS_CONTAINER redis-cli INFO clients 2>/dev/null | grep "connected_clients" | cut -d: -f2 | tr -d '\r' || echo "0")
    echo "Подключенных клиентов Redis: $CONNECTED_CLIENTS"
    
    if [ "$CONNECTED_CLIENTS" -gt 10 ]; then
        echo -e "${RED}⚠️  ВНИМАНИЕ: Много подключений к Redis!${NC}"
    else
        echo -e "${GREEN}✓ Количество подключений нормальное${NC}"
    fi
else
    echo "Контейнер Redis не запущен"
fi
echo ""

# Итоговый отчет
echo "=========================================="
echo "Итоговый отчет"
echo "=========================================="
echo ""

ISSUES=0

if [ "$REDIS_SUBS" -gt 5 ]; then
    echo -e "${RED}✗ Проблема: Множественные подписки Redis${NC}"
    ISSUES=$((ISSUES + 1))
fi

if [ "$BOT_STARTS" -gt 1 ]; then
    echo -e "${RED}✗ Проблема: Множественные запуски бота${NC}"
    ISSUES=$((ISSUES + 1))
fi

if [ "$DISCORD_ERRORS" -gt 10 ]; then
    echo -e "${RED}✗ Проблема: Много ошибок Discord${NC}"
    ISSUES=$((ISSUES + 1))
fi

if [ "$EVENTS_COUNT" -gt 1000 ]; then
    echo -e "${RED}✗ Проблема: Слишком много событий Redis${NC}"
    ISSUES=$((ISSUES + 1))
fi

if [ "$BOT_PROCESSES" -gt 2 ]; then
    echo -e "${RED}✗ Проблема: Множественные процессы бота${NC}"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ Подозрительной активности не обнаружено${NC}"
    echo ""
    echo "Если трафик все еще высокий, проверьте:"
    echo "  1. Внешние запросы к приложению (логи Nginx)"
    echo "  2. Сетевую активность через iftop: sudo iftop -i eth0"
    echo "  3. Процессы через nethogs: sudo nethogs"
else
    echo ""
    echo -e "${RED}Найдено проблем: $ISSUES${NC}"
    echo "Рекомендуется применить исправления из FIX_TRAFFIC_ISSUE.md"
fi

echo ""

