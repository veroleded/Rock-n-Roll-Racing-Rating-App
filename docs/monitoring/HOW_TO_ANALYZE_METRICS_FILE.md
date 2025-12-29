# Как анализировать файл метрик

Файл `logs/metrics/metrics.jsonl` содержит историю метрик в формате JSON Lines (каждая строка - отдельный JSON объект).

## Быстрый анализ

### 1. Использовать готовый скрипт (рекомендуется)

```bash
# Из корня проекта
./scripts/monitoring/analyze-metrics-file.sh

# Или указать путь к файлу
./scripts/monitoring/analyze-metrics-file.sh logs/metrics/metrics.jsonl
```

Скрипт покажет:
- Общее количество записей
- Последние 10 записей
- Общую статистику (сумма, максимум, среднее)
- Записи с высоким трафиком
- Статистику по часам

### 2. Прямой просмотр с jq

#### Последние записи:

```bash
# Последние 20 записей
tail -n 20 logs/metrics/metrics.jsonl | jq '.'

# Только важные поля
tail -n 20 logs/metrics/metrics.jsonl | jq '{timestamp, networkBytesOut, networkBytesIn, httpRequestsTotal}'
```

#### Общая статистика:

```bash
# Общий исходящий трафик
cat logs/metrics/metrics.jsonl | jq -s 'map(.networkBytesOut) | add'

# Общий входящий трафик
cat logs/metrics/metrics.jsonl | jq -s 'map(.networkBytesIn) | add'

# Максимальный исходящий трафик
cat logs/metrics/metrics.jsonl | jq -s 'map(.networkBytesOut) | max'

# Средний исходящий трафик
cat logs/metrics/metrics.jsonl | jq -s 'map(.networkBytesOut) | add / length'
```

#### Поиск проблем:

```bash
# Записи с трафиком > 1 GB
cat logs/metrics/metrics.jsonl | jq 'select(.networkBytesOut > 1073741824)'

# Записи с трафиком > 10 GB
cat logs/metrics/metrics.jsonl | jq 'select(.networkBytesOut > 10737418240)'

# Записи с временными метками
cat logs/metrics/metrics.jsonl | jq 'select(.networkBytesOut > 1073741824) | {timestamp, networkBytesOut, networkBytesIn}'
```

## Анализ за период

### За вчерашний вечер (21:00 - 01:00):

```bash
# Фильтр по времени
cat logs/metrics/metrics.jsonl | jq -r 'select(.timestamp | test("T(21|22|23|00|01):")) | {timestamp, networkBytesOut, networkBytesIn}'

# Сумма трафика за этот период
cat logs/metrics/metrics.jsonl | jq -s 'map(select(.timestamp | test("T(21|22|23|00|01):"))) | {totalOut: (map(.networkBytesOut) | add), totalIn: (map(.networkBytesIn) | add)}'
```

### За конкретную дату:

```bash
# За 28 декабря 2025
cat logs/metrics/metrics.jsonl | jq 'select(.timestamp | startswith("2025-12-28"))'

# Сумма за день
cat logs/metrics/metrics.jsonl | jq -s 'map(select(.timestamp | startswith("2025-12-28"))) | {totalOut: (map(.networkBytesOut) | add), totalIn: (map(.networkBytesIn) | add)}'
```

### За период (от и до):

```bash
# С 2025-12-28T21:00 до 2025-12-29T01:00
cat logs/metrics/metrics.jsonl | jq 'select(.timestamp >= "2025-12-28T21:00:00Z" and .timestamp <= "2025-12-29T01:00:00Z")'
```

## Детальный анализ

### Топ-10 записей по трафику:

```bash
# По исходящему трафику
cat logs/metrics/metrics.jsonl | jq -s 'sort_by(-.networkBytesOut) | .[0:10] | .[] | {timestamp, networkBytesOut, networkBytesIn}'

# По входящему трафику
cat logs/metrics/metrics.jsonl | jq -s 'sort_by(-.networkBytesIn) | .[0:10] | .[] | {timestamp, networkBytesOut, networkBytesIn}'
```

### Статистика по часам:

```bash
# Группировка по часам
cat logs/metrics/metrics.jsonl | jq -r '.timestamp' | cut -d'T' -f2 | cut -d':' -f1 | sort | uniq -c

# Сумма трафика по часам
cat logs/metrics/metrics.jsonl | jq -r '[.timestamp, .networkBytesOut, .networkBytesIn] | @tsv' | \
  awk '{hour=substr($1,12,2); out[hour]+=$2; in[hour]+=$3} END {for(h in out) print h":00 - Исходящий:", out[h], "Входящий:", in[h]}'
```

### Экспорт в CSV:

```bash
# Экспорт в CSV для анализа в Excel/Google Sheets
echo "timestamp,networkBytesOut,networkBytesIn,httpRequestsTotal,redisSubscriptions" > metrics.csv
cat logs/metrics/metrics.jsonl | jq -r '[.timestamp, .networkBytesOut, .networkBytesIn, .httpRequestsTotal, .redisSubscriptions] | @csv' >> metrics.csv
```

## Python скрипт для анализа

Создайте файл `analyze_metrics.py`:

```python
#!/usr/bin/env python3
import json
from datetime import datetime
from collections import defaultdict

def format_bytes(bytes_val):
    if bytes_val >= 1073741824:
        return f"{bytes_val / 1073741824:.2f} GB"
    elif bytes_val >= 1048576:
        return f"{bytes_val / 1048576:.2f} MB"
    elif bytes_val >= 1024:
        return f"{bytes_val / 1024:.2f} KB"
    return f"{bytes_val} B"

# Чтение файла
with open('logs/metrics/metrics.jsonl', 'r') as f:
    metrics = [json.loads(line) for line in f]

# Статистика
total_out = sum(m['networkBytesOut'] for m in metrics)
total_in = sum(m['networkBytesIn'] for m in metrics)
max_out = max(m['networkBytesOut'] for m in metrics)
max_in = max(m['networkBytesIn'] for m in metrics)

print(f"Всего записей: {len(metrics)}")
print(f"Общий исходящий трафик: {format_bytes(total_out)}")
print(f"Общий входящий трафик: {format_bytes(total_in)}")
print(f"Максимум исходящего: {format_bytes(max_out)}")
print(f"Максимум входящего: {format_bytes(max_in)}")

# По часам
hourly = defaultdict(lambda: {'out': 0, 'in': 0})
for m in metrics:
    hour = datetime.fromisoformat(m['timestamp'].replace('Z', '+00:00')).hour
    hourly[hour]['out'] += m['networkBytesOut']
    hourly[hour]['in'] += m['networkBytesIn']

print("\nПо часам:")
for hour in sorted(hourly.keys()):
    print(f"  {hour:02d}:00 - Исходящий: {format_bytes(hourly[hour]['out'])}, Входящий: {format_bytes(hourly[hour]['in'])}")
```

Использование:
```bash
python3 analyze_metrics.py
```

## Полезные команды

### Быстрая проверка размера файла:

```bash
ls -lh logs/metrics/metrics.jsonl
```

### Количество записей:

```bash
wc -l logs/metrics/metrics.jsonl
```

### Поиск конкретного времени:

```bash
# Найти записи за 21:00
grep "T21:" logs/metrics/metrics.jsonl | jq '.'

# Найти записи за 22:00-23:00
grep -E "T(22|23):" logs/metrics/metrics.jsonl | jq '.'
```

### Экспорт проблемных записей:

```bash
# Экспорт записей с трафиком > 1 GB в отдельный файл
cat logs/metrics/metrics.jsonl | jq 'select(.networkBytesOut > 1073741824)' > high_traffic.jsonl
```

## Интеграция с другими инструментами

### Grafana:

Можно импортировать данные в Grafana через JSON datasource или преобразовать в формат, который понимает Grafana.

### Excel/Google Sheets:

Экспортируйте в CSV (см. выше) и откройте в табличном редакторе для визуализации.

## Дополнительная информация

- **Формат файла:** JSON Lines (каждая строка - валидный JSON)
- **Интервал записи:** Каждые 5 минут
- **Размер файла:** Автоматически очищается (хранит 30 дней по умолчанию)
- **Путь на сервере:** `/root/Rock-n-Roll-Racing-Rating-App/logs/metrics/metrics.jsonl`

