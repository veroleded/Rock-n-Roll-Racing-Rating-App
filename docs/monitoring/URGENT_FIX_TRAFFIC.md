# СРОЧНОЕ ИСПРАВЛЕНИЕ: Блокировка сервера из-за трафика

## Проблема

Сервер был заблокирован из-за отправки **огромного количества пакетов в секунду** (в 1000 раз больше обычного). Это не проблема объема данных, а проблема **количества сетевых пакетов**.

## Что было сделано

### 1. Rate Limiting в Nginx ✅

Добавлен rate limiting в `nginx.bogdan.conf`:

- **Общие запросы**: 30 запросов/сек с burst до 50
- **API запросы**: 10 запросов/сек с burst до 20
- **Соединения**: максимум 20 соединений с одного IP

### 3. Улучшение логирования Discord бота ✅

- Добавлен cooldown между переподключениями (1 минута)
- Улучшено логирование с временными метками
- Сброс счетчика переподключений при успешном подключении

### 4. Скрипты анализа ✅

Созданы скрипты для анализа:
- `scripts/analysis/analyze-night-traffic.sh` - анализ ночного трафика
- `scripts/analysis/analyze-nginx-attacks.sh` - анализ атак и ботов в логах Nginx

## Что нужно сделать на сервере СЕЙЧАС

### 0. Отключить системный nginx (если запущен)

Если на сервере запущен системный nginx (не в Docker), отключите его:

```bash
cd /root/Rock-n-Roll-Racing-Rating-App
sudo ./scripts/security/disable-system-nginx.sh
```

Или вручную:
```bash
sudo systemctl stop nginx
sudo systemctl disable nginx
```

Подробнее: `docs/deployment/DISABLE_SYSTEM_NGINX.md`

### 1. Обновить Nginx конфигурацию

```bash
cd /root/Rock-n-Roll-Racing-Rating-App

# Сделать backup текущей конфигурации
cp nginx.bogdan.conf nginx.bogdan.conf.backup

# Обновить из репозитория
git pull

# Перезапустить Nginx
docker-compose -f docker-compose.prod.bogdan.yml restart nginx

# Проверить, что Nginx запустился без ошибок
docker-compose -f docker-compose.prod.bogdan.yml logs nginx | tail -20
```

### 2. Проверить текущее состояние

```bash
# Проверить активные подписки Redis
docker exec rnr_racing_redis_bogdan redis-cli PUBSUB NUMSUB

# Проверить логи Discord бота на предмет переподключений
docker logs --tail 100 rnr_racing_app_bogdan | grep -i "reconnect\|error"

# Проверить количество HTTP запросов
docker logs --tail 100 rnr_racing_nginx_bogdan | grep -c "GET\|POST"
```

### 3. Запустить анализ

```bash
# Анализ вчерашней ночи
./scripts/analysis/analyze-night-traffic.sh

# Анализ атак в логах Nginx
./scripts/analysis/analyze-nginx-attacks.sh

# Анализ конкретной даты
./scripts/analysis/analyze-night-traffic.sh 2025-12-29
```

### 4. Мониторинг в реальном времени

```bash
# Установить инструменты (если еще не установлены)
sudo apt update && sudo apt install -y nethogs iftop

# Мониторинг пакетов по процессам
sudo nethogs

# Мониторинг трафика по соединениям
sudo iftop -i eth0
```

## Возможные причины проблемы

1. **Discord бот** - множественные переподключения в цикле
2. **Redis pub/sub** - утечки подписок, множественные публикации
3. **HTTP запросы** - DDoS или боты, множественные запросы
4. **WebSocket** - множественные соединения

## Дополнительные меры защиты

### Fail2ban для автоматической блокировки

Установите fail2ban для автоматической блокировки подозрительных IP:

```bash
cd /root/Rock-n-Roll-Racing-Rating-App
sudo ./scripts/security/setup-fail2ban.sh
```

Это автоматически заблокирует IP адреса, которые:
- Превышают rate limit
- Делают подозрительные запросы (WordPress, PHP сканеры)
- Генерируют множественные 404 ошибки

Подробная документация: `docs/security/FAIL2BAN_SETUP.md`

### Другие меры

Если проблема повторяется, можно:

1. **Установить fail2ban** (если еще не установлен):
   ```bash
   sudo ./scripts/security/setup-fail2ban.sh
   ```

2. **Увеличить строгость rate limiting**:

   - Уменьшить `rate=10r/s` до `rate=5r/s` для API
   - Уменьшить `rate=30r/s` до `rate=15r/s` для общих запросов

3. **Добавить блокировку подозрительных IP**:

   ```nginx
   # В nginx.bogdan.conf добавить:
   deny 1.2.3.4;  # Замените на подозрительный IP
   ```

4. **Использовать Cloudflare** для защиты от DDoS

5. **Ограничить количество WebSocket соединений**

## Мониторинг

Запускайте анализ каждое утро:

```bash
./scripts/analysis/analyze-night-traffic.sh
```

Если обнаружены аномалии, проверьте логи детально.
