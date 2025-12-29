# Fail2ban - Автоматическая блокировка атак

## Быстрая установка

```bash
cd /root/Rock-n-Roll-Racing-Rating-App
sudo ./scripts/security/setup-fail2ban.sh
```

## Что делает fail2ban?

Автоматически блокирует IP адреса, которые:
- ✅ Превышают rate limit в Nginx
- ✅ Делают подозрительные запросы (WordPress, PHP сканеры)
- ✅ Генерируют множественные 404/403 ошибки

## Настроенные jail

1. **nginx-limit-req** - блокирует при превышении rate limit (5 попыток → бан 30 мин)
2. **nginx-404** - блокирует WordPress/PHP сканеры (5 попыток → бан 1 час)
3. **nginx-bot** - блокирует ботов (10 попыток → бан 2 часа)

## Полезные команды

```bash
# Статус
sudo fail2ban-client status

# Статус конкретного jail
sudo fail2ban-client status nginx-404

# Разблокировать IP
sudo fail2ban-client set nginx-404 unbanip 1.2.3.4

# Логи
sudo tail -f /var/log/fail2ban.log
```

## Документация

Полная документация: `docs/security/FAIL2BAN_SETUP.md`

