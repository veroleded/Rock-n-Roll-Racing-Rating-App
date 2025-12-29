#!/bin/bash

# Скрипт для установки и настройки fail2ban для защиты Nginx
# Использование: sudo ./scripts/security/setup-fail2ban.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=========================================="
echo "  Установка и настройка fail2ban"
echo "=========================================="
echo ""

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Этот скрипт должен быть запущен с правами root (sudo)"
    exit 1
fi

# Установка fail2ban
echo "📦 1. Установка fail2ban..."
if ! command -v fail2ban-server &> /dev/null; then
    apt update
    apt install -y fail2ban
    echo "✅ fail2ban установлен"
else
    echo "✅ fail2ban уже установлен"
fi

# Создание директории для конфигурации
echo ""
echo "📁 2. Создание конфигурации..."
mkdir -p /etc/fail2ban/jail.d
mkdir -p /etc/fail2ban/filter.d

# Создание фильтра для Nginx rate limiting
echo ""
echo "🔍 3. Создание фильтра для Nginx rate limiting..."
cat > /etc/fail2ban/filter.d/nginx-limit-req.conf << 'EOF'
# Fail2ban filter для Nginx rate limiting ошибок
[Definition]
failregex = limiting requests, excess: .* by zone .*, client: <HOST>
ignoreregex =
EOF

# Создание фильтра для Nginx 404 ошибок (подозрительные запросы)
cat > /etc/fail2ban/filter.d/nginx-404.conf << 'EOF'
# Fail2ban filter для подозрительных 404 ошибок (WordPress, PHP сканеры)
[Definition]
# WordPress сканеры
failregex = ^<HOST>.*"(GET|POST|HEAD) /(wp-admin|wp-content|wp-includes|wordpress|xmlrpc\.php).*" 404
            ^<HOST>.*"(GET|POST|HEAD) /.*\.(php|asp|aspx|jsp).*" 404
            ^<HOST>.*"(GET|POST|HEAD) /(admin|administrator|phpmyadmin|mysql|backup|install|setup).*" 404
ignoreregex = ^<HOST>.*"(GET|POST|HEAD) /api/.*" 404
EOF

# Создание фильтра для множественных запросов с одного IP
cat > /etc/fail2ban/filter.d/nginx-bot.conf << 'EOF'
# Fail2ban filter для обнаружения ботов (множественные запросы к несуществующим путям)
[Definition]
# Этот фильтр будет использоваться с maxretry для обнаружения множественных 404
failregex = ^<HOST>.*" (GET|POST|HEAD) .*" (404|403|444)
ignoreregex = ^<HOST>.*" (GET|POST|HEAD) /api/.*" (404|403)
            ^<HOST>.*" (GET|POST|HEAD) /_next/.*" (404|403)
EOF

# Создание основной конфигурации jail
echo ""
echo "⚙️  4. Настройка jail конфигурации..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Время бана в секундах (1 час)
bantime = 3600

# Время окна для подсчета попыток (10 минут)
findtime = 600

# Количество попыток до бана
maxretry = 10

# Email для уведомлений (раскомментируйте и укажите свой email)
# destemail = your-email@example.com
# sendername = Fail2Ban
# action = %(action_mwl)s

# Backend для работы с логами
backend = auto

# Игнорируем локальные IP
ignoreip = 127.0.0.1/8 ::1 172.17.0.0/16 172.18.0.0/16

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
maxretry = 5
bantime = 3600

# Nginx rate limiting
[nginx-limit-req]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 5
findtime = 300
bantime = 1800
action = iptables-multiport[name=nginx-limit-req, port="http,https", protocol=tcp]

# Nginx подозрительные 404 (WordPress, PHP сканеры)
[nginx-404]
enabled = true
port = http,https
filter = nginx-404
logpath = /var/log/nginx/access.log
maxretry = 5
findtime = 600
bantime = 3600
action = iptables-multiport[name=nginx-404, port="http,https", protocol=tcp]

# Nginx боты (множественные 404/403)
[nginx-bot]
enabled = true
port = http,https
filter = nginx-bot
logpath = /var/log/nginx/access.log
maxretry = 10
findtime = 300
bantime = 7200
action = iptables-multiport[name=nginx-bot, port="http,https", protocol=tcp]
EOF

# Если логи Nginx находятся в Docker контейнере, нужно настроить путь
echo ""
echo "🐳 5. Проверка расположения логов Nginx..."
if docker ps --format '{{.Names}}' | grep -q "rnr_racing_nginx"; then
    NGINX_CONTAINER=$(docker ps --format '{{.Names}}' | grep "rnr_racing_nginx" | head -1)
    echo "   Обнаружен контейнер Nginx: $NGINX_CONTAINER"
    echo ""
    echo "   ⚠️  ВАЖНО: Логи Nginx находятся в Docker контейнере."
    echo "   Нужно либо:"
    echo "   1. Монтировать логи на хост (рекомендуется)"
    echo "   2. Использовать docker logs для fail2ban"
    echo ""
    echo "   Для монтирования логов добавьте в docker-compose.prod.bogdan.yml:"
    echo "   volumes:"
    echo "     - ./logs/nginx:/var/log/nginx"
    echo ""
    echo "   Затем обновите пути в /etc/fail2ban/jail.local:"
    echo "   logpath = $PROJECT_ROOT/logs/nginx/error.log"
    echo "   logpath = $PROJECT_ROOT/logs/nginx/access.log"
fi

# Запуск и включение fail2ban
echo ""
echo "🚀 6. Запуск fail2ban..."
systemctl enable fail2ban
systemctl restart fail2ban

# Проверка статуса
echo ""
echo "✅ 7. Проверка статуса..."
sleep 2
if systemctl is-active --quiet fail2ban; then
    echo "   ✅ fail2ban запущен и работает"
    echo ""
    echo "   Текущие jail:"
    fail2ban-client status | grep "Jail list" || fail2ban-client status
else
    echo "   ❌ Ошибка запуска fail2ban"
    echo "   Проверьте логи: journalctl -u fail2ban -n 50"
    exit 1
fi

echo ""
echo "=========================================="
echo "  ✅ fail2ban успешно настроен!"
echo "=========================================="
echo ""
echo "📋 Полезные команды:"
echo ""
echo "  # Проверить статус всех jail"
echo "  sudo fail2ban-client status"
echo ""
echo "  # Проверить конкретный jail"
echo "  sudo fail2ban-client status nginx-404"
echo ""
echo "  # Посмотреть заблокированные IP"
echo "  sudo fail2ban-client status nginx-404"
echo ""
echo "  # Разблокировать IP вручную"
echo "  sudo fail2ban-client set nginx-404 unbanip 1.2.3.4"
echo ""
echo "  # Заблокировать IP вручную"
echo "  sudo fail2ban-client set nginx-404 banip 1.2.3.4"
echo ""
echo "  # Проверить логи fail2ban"
echo "  sudo tail -f /var/log/fail2ban.log"
echo ""
echo "📚 Документация: docs/security/FAIL2BAN_SETUP.md"

