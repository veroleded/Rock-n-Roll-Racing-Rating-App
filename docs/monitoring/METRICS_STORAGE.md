# Сохранение метрик

## Как это работает

Метрики автоматически сохраняются в файл каждые **5 минут** в формате JSON Lines.

### Где сохраняются

- **Путь:** `logs/metrics/metrics.jsonl`
- **Формат:** JSON Lines (каждая строка - отдельный JSON объект)
- **Интервал:** Автоматически каждые 5 минут

### Что сохраняется

Каждая запись содержит:

```json
{
  "timestamp": "2025-12-28T14:30:00.000Z",
  "networkBytesOut": 4611686018427387904,
  "networkBytesIn": 1024000,
  "httpRequestsTotal": 150,
  "redisSubscriptions": 2,
  "discordReconnects": 0,
  "rawMetrics": "# TYPE network_bytes_out_total counter\nnetwork_bytes_out_total 4611686018427387904\n..."
}
```

## Просмотр истории

### 1. Через скрипт (рекомендуется)

```bash
./view-metrics-history.sh
```

Показывает:

- Последние 20 записей с форматированием
- Статистику за весь период
- Общий и максимальный трафик

### 2. Через API

```bash
# Последние 20 записей
curl http://localhost:3000/api/metrics/history?limit=20

# Статистика
curl http://localhost:3000/api/metrics/history?stats=true

# За период
curl "http://localhost:3000/api/metrics/history?startDate=2025-12-28T00:00:00Z&endDate=2025-12-28T23:59:59Z"
```

### 3. Прямой просмотр файла

```bash
# Последние записи
tail -n 20 logs/metrics/metrics.jsonl | jq '.'

# Поиск записей с высоким трафиком (> 1 GB)
cat logs/metrics/metrics.jsonl | jq 'select(.networkBytesOut > 1073741824)'

# Подсчет общего трафика
cat logs/metrics/metrics.jsonl | jq -s 'map(.networkBytesOut) | add'
```

## Важные моменты

### Сброс счетчиков

- **В памяти:** Счетчики Prometheus сбрасываются при перезапуске приложения
- **В файле:** История сохраняется и не теряется при перезапуске

### Автоматическая очистка

Файл `metrics.jsonl` автоматически очищается каждый день в 2:00 (хранит последние 30 дней).

**Настройка:**

```bash
# Автоматическая настройка
sudo ./scripts/setup-log-cleanup-cron.sh

# Или вручную через crontab
crontab -e
# Добавить:
0 2 * * * cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup-metrics-logs.sh 30 >> logs/cleanup.log 2>&1
```

**Ручная очистка:**

```bash
# Очистить, оставив последние 30 дней
./scripts/cleanup-metrics-logs.sh 30

# Очистить, оставив последние 7 дней
./scripts/cleanup-metrics-logs.sh 7
```

Подробнее: [LOG_CLEANUP.md](./LOG_CLEANUP.md)

### Пример ротации логов

```bash
# Архивировать старые записи (старше 30 дней)
find logs/metrics -name "metrics.jsonl" -mtime +30 -exec gzip {} \;

# Очистить старые архивы (старше 90 дней)
find logs/metrics -name "metrics.jsonl.gz" -mtime +90 -delete
```

## Использование в Docker

В Docker контейнере файлы сохраняются внутри контейнера. Для постоянного хранения:

1. **Монтировать volume:**

```yaml
volumes:
  - ./logs:/app/logs
```

2. **Или копировать при необходимости:**

```bash
docker cp <container_id>:/app/logs/metrics ./logs/
```

## Анализ трафика

### Найти момент высокого трафика

```bash
# Найти записи с трафиком > 10 GB
cat logs/metrics/metrics.jsonl | jq 'select(.networkBytesOut > 10737418240)'

# Показать временные метки
cat logs/metrics/metrics.jsonl | jq 'select(.networkBytesOut > 10737418240) | .timestamp'
```

### Подсчитать трафик за день

```bash
# За сегодня
cat logs/metrics/metrics.jsonl | jq -s 'map(select(.timestamp | startswith("2025-12-28"))) | map(.networkBytesOut) | add'

# За период
cat logs/metrics/metrics.jsonl | jq -s 'map(select(.timestamp >= "2025-12-28T00:00:00Z" and .timestamp <= "2025-12-28T23:59:59Z")) | map(.networkBytesOut) | add'
```

## Интеграция с мониторингом

Метрики можно экспортировать в системы мониторинга:

1. **Prometheus + Grafana:** Используйте `/api/metrics` endpoint
2. **Локальный анализ:** Используйте сохраненные JSON файлы
3. **Алерты:** Настройте проверку файла на высокий трафик
