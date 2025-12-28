# Как проанализировать трафик на сервере

## Быстрый анализ

### 1. Запустите основной скрипт анализа

```bash
chmod +x analyze-traffic.sh
./analyze-traffic.sh
```

Этот скрипт покажет:
- Статус контейнеров
- Использование ресурсов
- Анализ логов на подозрительную активность
- Сетевую статистику
- Активные соединения

### 2. Проверьте подозрительную активность

```bash
chmod +x check-suspicious-activity.sh
./check-suspicious-activity.sh
```

Этот скрипт найдет:
- Множественные подписки Redis
- Множественные запуски бота
- Ошибки переподключения Discord
- Аномально высокую частоту событий
- Множественные процессы бота

### 3. Анализ логов Nginx

```bash
chmod +x analyze-nginx-logs.sh
./analyze-nginx-logs.sh
```

Покажет:
- Топ IP адресов по запросам
- Самые популярные URL
- Коды ответов
- Подозрительные User-Agent

## Мониторинг в реальном времени

### Вариант 1: iftop (детальный анализ соединений)

```bash
# Установка
sudo apt update && sudo apt install -y iftop

# Запуск
sudo iftop -i eth0

# Или через скрипт
chmod +x monitor-traffic-realtime.sh
./monitor-traffic-realtime.sh eth0
# Выберите опцию 1
```

**Что смотреть:**
- Строки с высоким трафиком (стрелки вверх/вниз)
- IP адреса с большим количеством данных
- Порт и протокол (443 = HTTPS, 80 = HTTP)

### Вариант 2: nethogs (трафик по процессам)

```bash
# Установка
sudo apt update && sudo apt install -y nethogs

# Запуск
sudo nethogs eth0

# Или через скрипт
./monitor-traffic-realtime.sh eth0
# Выберите опцию 2
```

**Что смотреть:**
- Процессы с высоким отправленным (Sent) трафиком
- Процессы Docker контейнеров

### Вариант 3: Docker stats (ресурсы контейнеров)

```bash
# Запуск
docker stats rnr_racing_app_bogdan rnr_racing_nginx_bogdan

# Или через скрипт
./monitor-traffic-realtime.sh eth0
# Выберите опцию 4
```

**Что смотреть:**
- Строка NET I/O - показывает входящий и исходящий трафик
- Если исходящий трафик растет очень быстро - это проблема

## Детальный анализ логов

### Сохранение логов для анализа

```bash
# Логи приложения
docker logs rnr_racing_app_bogdan > /tmp/app_logs.txt

# Логи Nginx
docker logs rnr_racing_nginx_bogdan > /tmp/nginx_logs.txt

# Последний час логов приложения
docker logs --since 1h rnr_racing_app_bogdan > /tmp/app_logs_1h.txt
```

### Поиск конкретных проблем

#### 1. Множественные подписки Redis

```bash
docker logs rnr_racing_app_bogdan | grep -c "Подписан на события"
# Должно быть мало (2-4), не сотни!
```

#### 2. Множественные запуски бота

```bash
docker logs rnr_racing_app_bogdan | grep -i "бот готов\|bot.*ready"
# Должен быть только один запуск
```

#### 3. Ошибки Discord

```bash
docker logs rnr_racing_app_bogdan | grep -i "discord.*error\|discord.*reconnect" | tail -50
```

#### 4. Частота событий Redis

```bash
docker logs --since 1h rnr_racing_app_bogdan | grep -c "Получено событие"
# Если очень много (тысячи) - проблема
```

#### 5. HTTP запросы в Nginx

```bash
# Количество запросов
docker logs --since 1h rnr_racing_nginx_bogdan | grep -c "GET\|POST"

# Топ IP адресов
docker logs --since 1h rnr_racing_nginx_bogdan | grep -oE "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" | sort | uniq -c | sort -rn | head -20
```

#### 6. Поиск внешних запросов

```bash
# Запросы не с вашего IP
docker logs --since 1h rnr_racing_nginx_bogdan | grep -v "YOUR_IP_HERE" | grep -E "GET|POST" | head -50
```

## Использование tcpdump для детального анализа

```bash
# Установка
sudo apt update && sudo apt install -y tcpdump

# Захват пакетов на порту 443 (HTTPS)
sudo tcpdump -i eth0 -n 'port 443' -c 100 -A

# Захват на порту 80 (HTTP)
sudo tcpdump -i eth0 -n 'port 80' -c 100 -A

# Сохранение в файл для анализа
sudo tcpdump -i eth0 -w /tmp/traffic.pcap -c 1000
# Анализ файла (установите wireshark для GUI анализа)
```

## Статистика сетевых интерфейсов

```bash
# Текущая статистика
cat /proc/net/dev

# Сохранить для сравнения
cat /proc/net/dev > /tmp/net_before.txt

# Подождать 5 минут, затем
cat /proc/net/dev > /tmp/net_after.txt

# Сравнить
diff /tmp/net_before.txt /tmp/net_after.txt
```

## Проверка активных соединений

```bash
# Все активные TCP соединения
ss -tnp | grep ESTAB

# Соединения с конкретным IP (например, Discord)
ss -tnp | grep "discord"

# Соединения контейнеров
docker exec rnr_racing_app_bogdan netstat -tnp 2>/dev/null || docker exec rnr_racing_app_bogdan ss -tnp
```

## Что искать в логах

### Красные флаги (признаки проблемы):

1. **Много подписок Redis:**
   ```
   [Redis] Подписан на события MATCH_CREATED
   [Redis] Подписан на события MATCH_CREATED  # Дубликат!
   ```

2. **Множественные запуски бота:**
   ```
   Бот готов! Вошел как BotName
   Бот готов! Вошел как BotName  # Дубликат!
   ```

3. **Бесконечные переподключения:**
   ```
   [Discord Client] Переподключение к Discord...
   [Discord Client] Переподключение к Discord...
   [Discord Client] Переподключение к Discord...
   ```

4. **Высокая частота событий:**
   ```
   [Redis] Получено событие ...  # тысячи раз в час
   ```

5. **Множественные процессы:**
   ```bash
   docker exec rnr_racing_app_bogdan ps aux | grep bot
   # Должен быть только один процесс tsx src/bot/index.ts
   ```

## Рекомендации

1. **Запустите анализ сразу после перезапуска** - чтобы увидеть начальное состояние
2. **Мониторьте в реальном времени первые 30 минут** - чтобы увидеть рост трафика
3. **Сравните до и после исправлений** - чтобы убедиться, что проблема решена
4. **Сохраняйте логи** - для детального анализа позже

## Если проблема не решена

1. Проверьте логи хостинг провайдера (могут быть детали)
2. Установите vnstat для долгосрочной статистики:
   ```bash
   sudo apt install -y vnstat
   sudo vnstat -i eth0
   ```
3. Свяжитесь с хостинг провайдером - они могут предоставить детальную статистику

