#!/bin/bash
# Скрипт для проверки срока действия SSL сертификата

DOMAIN="rocknrollracing.online"

echo "🔍 Проверка SSL сертификата для $DOMAIN..."
echo ""

# Проверка доступности домена
if ! curl -s --head https://$DOMAIN > /dev/null; then
    echo "❌ ОШИБКА: Домен $DOMAIN недоступен по HTTPS"
    exit 1
fi

# Получение информации о сертификате
CERT_INFO=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -subject -dates -issuer 2>/dev/null)

if [ -z "$CERT_INFO" ]; then
    echo "❌ ОШИБКА: Не удалось получить информацию о сертификате"
    exit 1
fi

# Извлечение дат
NOT_BEFORE=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -startdate | cut -d= -f2)
NOT_AFTER=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)

# Конвертация в Unix timestamp
NOT_AFTER_TS=$(date -d "$NOT_AFTER" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$NOT_AFTER" +%s 2>/dev/null)
CURRENT_TS=$(date +%s)

if [ -z "$NOT_AFTER_TS" ]; then
    echo "❌ ОШИБКА: Не удалось определить срок действия сертификата"
    exit 1
fi

# Вычисление дней до истечения
DAYS_LEFT=$(( ($NOT_AFTER_TS - $CURRENT_TS) / 86400 ))

echo "📋 Информация о сертификате:"
echo "$CERT_INFO"
echo ""
echo "📅 Действителен с: $NOT_BEFORE"
echo "📅 Действителен до: $NOT_AFTER"
echo ""

# Проверка срока действия
if [ $DAYS_LEFT -lt 0 ]; then
    echo "❌ КРИТИЧНО: Сертификат истек!"
    echo "   Запустите: sudo certbot renew --force-renewal"
    exit 1
elif [ $DAYS_LEFT -lt 7 ]; then
    echo "⚠️  ВНИМАНИЕ: Сертификат истекает через $DAYS_LEFT дней!"
    echo "   Рекомендуется обновить: sudo certbot renew"
    exit 1
elif [ $DAYS_LEFT -lt 30 ]; then
    echo "⚠️  Предупреждение: Сертификат истекает через $DAYS_LEFT дней"
    echo "   Автоматическое обновление должно сработать в ближайшее время"
else
    echo "✅ Сертификат действителен еще $DAYS_LEFT дней"
fi

# Проверка редиректа HTTP -> HTTPS
echo ""
echo "🔍 Проверка редиректа HTTP -> HTTPS..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN)
if [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo "✅ HTTP корректно редиректит на HTTPS (код: $HTTP_STATUS)"
else
    echo "⚠️  HTTP возвращает код $HTTP_STATUS (ожидается 301 или 302)"
fi

echo ""
echo "✅ Проверка завершена"

