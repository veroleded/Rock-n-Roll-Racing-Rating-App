# Как посмотреть исторические логи VPS сервера

## Быстрый анализ вчерашних событий

### 1. Основной скрипт анализа исторических логов

```bash
chmod +x analyze-historical-logs.sh
./analyze-historical-logs.sh 1
```

Параметр `1` означает "1 день назад" (вчера). Можно указать другое число для анализа более старых дней.

**Что покажет:**
- Системные логи за период
- Логи Docker контейнеров за период
- Логи Nginx с диска
- Логи авторизации (попытки входа)
- Общие системные логи

### 2. Поиск пика трафика по часам

```bash
chmod +x find-traffic-peak.sh
./find-traffic-peak.sh 1
```

Этот скрипт поможет найти точное время (час), когда был пик трафика.

**Что покажет:**
- Количество запросов по каждому часу
- ТОП часов с наибольшей активностью
- Рекомендации по детальному анализу

### 3. Экспорт всех логов для детального анализа

```bash
chmod +x export-logs-for-analysis.sh
./export-logs-for-analysis.sh 1
```

Экспортирует все логи за период в `/tmp/logs_export_YYYY-MM-DD_HHMMSS/` для детального анализа.

## Ручной анализ через системные команды

### Системные логи через journalctl

```bash
# Все логи за вчера
sudo journalctl --since "yesterday 00:00:00" --until "yesterday 23:59:59"

# Логи за конкретный час (например, 20:00-21:00)
sudo journalctl --since "2024-12-27 20:00:00" --until "2024-12-27 21:00:00"

# Только ошибки
sudo journalctl --since "yesterday" --until "today" -p err

# События Docker
sudo journalctl --since "yesterday" -u docker

# Поиск конкретных событий
sudo journalctl --since "yesterday" | grep -i "network\|error\|discord"
```

### Логи Docker контейнеров за период

```bash
# Логи приложения за вчера
docker logs --since "yesterday 00:00:00" --until "yesterday 23:59:59" rnr_racing_app_bogdan

# Логи Nginx за конкретный час
docker logs --since "2024-12-27 20:00:00" --until "2024-12-27 21:00:00" rnr_racing_nginx_bogdan

# Сохранение логов в файл
docker logs --since "yesterday" rnr_racing_app_bogdan > /tmp/docker_app_yesterday.txt
```

### Логи Nginx с диска

```bash
# Проверка наличия логов
ls -lh /var/log/nginx/

# Все запросы за вчера
grep "2024-12-27" /var/log/nginx/access.log

# Запросы за конкретный час
grep "2024-12-27" /var/log/nginx/access.log | grep "20:"

# ТОП IP адресов за вчера
grep "2024-12-27" /var/log/nginx/access.log | grep -oE "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" | sort | uniq -c | sort -rn | head -20

# ТОП URL
grep "2024-12-27" /var/log/nginx/access.log | grep -oE '"(GET|POST|PUT|DELETE|PATCH) [^"]*' | cut -d' ' -f2 | sort | uniq -c | sort -rn | head -20

# Размер ответов (если в логах есть)
grep "2024-12-27" /var/log/nginx/access.log | awk '{sum+=$10} END {print "Total bytes:", sum}'
```

### Логи авторизации (проверка подозрительных входов)

```bash
# Debian/Ubuntu
sudo grep "2024-12-27" /var/log/auth.log

# RedHat/CentOS
sudo grep "2024-12-27" /var/log/secure

# Неудачные попытки входа
sudo grep "2024-12-27" /var/log/auth.log | grep -i "failed\|invalid"
```

### Общие системные логи

```bash
# syslog (Debian/Ubuntu)
grep "2024-12-27" /var/log/syslog | tail -100

# messages (RedHat/CentOS)
grep "2024-12-27" /var/log/messages | tail -100

# dmesg (системные сообщения)
dmesg | grep -i "2024-12-27\|Dec 27"
```

## Поиск конкретных проблем

### 1. Множественные подписки Redis в исторических логах

```bash
# В логах приложения за вчера
docker logs --since "yesterday" rnr_racing_app_bogdan 2>&1 | grep -c "Подписан на события"

# Должно быть мало (2-4), не сотни!
```

### 2. Множественные запуски бота

```bash
docker logs --since "yesterday" rnr_racing_app_bogdan 2>&1 | grep -i "бот готов\|bot.*ready"
```

### 3. Ошибки переподключения Discord

```bash
docker logs --since "yesterday" rnr_racing_app_bogdan 2>&1 | grep -i "discord.*error\|discord.*reconnect" | tail -50
```

### 4. Внешние запросы (не ваш IP)

```bash
# Замените YOUR_IP на ваш IP адрес
grep "2024-12-27" /var/log/nginx/access.log | grep -v "YOUR_IP" | head -50
```

### 5. Большие размеры ответов

```bash
# Если в логах Nginx есть размер ответа (поле $body_bytes_sent)
grep "2024-12-27" /var/log/nginx/access.log | awk '$10 > 1000000 {print}' | head -50
```

## Анализ по времени

### Поиск пикового часа

```bash
# Подсчет запросов по часам
for hour in {00..23}; do
    count=$(grep "2024-12-27" /var/log/nginx/access.log 2>/dev/null | grep -c ":$hour:" || echo "0")
    echo "$hour:00 - $count запросов"
done | sort -t: -k2 -rn
```

### Детальный анализ конкретного часа

```bash
# Например, для 20:00-21:00
sudo journalctl --since "2024-12-27 20:00:00" --until "2024-12-27 21:00:00"
docker logs --since "2024-12-27 20:00:00" --until "2024-12-27 21:00:00" rnr_racing_app_bogdan
grep "2024-12-27" /var/log/nginx/access.log | grep "20:" | head -100
```

## Проверка ротации логов

Логи могут быть заархивированы или удалены:

```bash
# Проверка архивов логов Nginx
ls -lh /var/log/nginx/*.log*
ls -lh /var/log/nginx/*.gz

# Распаковка и анализ архива
zcat /var/log/nginx/access.log.1.gz | grep "2024-12-27" | head -100

# Проверка настроек ротации
cat /etc/logrotate.d/nginx
cat /etc/logrotate.conf
```

## Проверка journalctl retention

```bash
# Проверка размера журнала
sudo journalctl --disk-usage

# Проверка доступных периодов
sudo journalctl --list-boots

# Если логи удалены, проверьте настройки
cat /etc/systemd/journald.conf | grep -i "systemmaxuse\|maxretentionsec"
```

## Сохранение логов для дальнейшего анализа

```bash
# Создание директории
mkdir -p ~/logs_analysis_$(date +%Y%m%d)

# Сохранение системных логов
sudo journalctl --since "yesterday" > ~/logs_analysis_$(date +%Y%m%d)/system.log

# Сохранение логов Docker
docker logs --since "yesterday" rnr_racing_app_bogdan > ~/logs_analysis_$(date +%Y%m%d)/docker_app.log
docker logs --since "yesterday" rnr_racing_nginx_bogdan > ~/logs_analysis_$(date +%Y%m%d)/docker_nginx.log

# Сохранение логов Nginx
grep "$(date -d yesterday +%Y-%m-%d)" /var/log/nginx/access.log > ~/logs_analysis_$(date +%Y%m%d)/nginx_access.log 2>/dev/null || echo "Файл не найден"

# Архивация
tar -czf ~/logs_analysis_$(date +%Y%m%d).tar.gz ~/logs_analysis_$(date +%Y%m%d)/
```

## Что искать в логах для диагностики трафика

### Красные флаги:

1. **Высокая частота запросов от одного IP:**
   ```bash
   grep "2024-12-27" /var/log/nginx/access.log | grep -oE "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" | sort | uniq -c | sort -rn | head -10
   ```
   Если один IP делает тысячи запросов - подозрительно!

2. **Большие размеры ответов:**
   - Проверьте, не отдается ли большой файл многократно
   - Ищите запросы к `/api/downloads/` или другим эндпоинтам для скачивания

3. **Множественные переподключения:**
   - Discord бот переподключается много раз
   - Redis создает множество соединений

4. **Ошибки 500/502/503:**
   - Могут указывать на проблемы с приложением
   - Высокая частота ошибок = возможная утечка

5. **Подозрительные User-Agent:**
   - Боты, скраперы, необычные браузеры

## Если логи удалены

Если логи были удалены ротацией или по другим причинам:

1. **Проверьте настройки ротации:**
   ```bash
   cat /etc/logrotate.d/nginx
   ```

2. **Проверьте архивные файлы:**
   ```bash
   find /var/log -name "*.gz" -type f -mtime -7
   ```

3. **Свяжитесь с хостинг провайдером:**
   - Они могут иметь доступ к логам, которые недоступны вам
   - Попросите предоставить статистику трафика по часам

## Рекомендации

1. **Сохраните логи сразу** после обнаружения проблемы
2. **Используйте экспорт скрипт** для создания полного дампа
3. **Анализируйте по часам** - так легче найти пик
4. **Проверьте несколько источников** - Docker логи, Nginx логи, системные логи

