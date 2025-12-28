#!/bin/bash

# Скрипт для очистки и ротации логов метрик
# Использование: ./cleanup-metrics-logs.sh [дней_хранения]
# По умолчанию: хранит последние 30 дней

set -e

DAYS_TO_KEEP=${1:-30}
METRICS_LOG_DIR="${2:-logs/metrics}"
METRICS_LOG_FILE="${METRICS_LOG_DIR}/metrics.jsonl"
ARCHIVE_DIR="${METRICS_LOG_DIR}/archive"

echo "=========================================="
echo "  Очистка логов метрик"
echo "=========================================="
echo "Директория: $METRICS_LOG_DIR"
echo "Хранить записи: последние $DAYS_TO_KEEP дней"
echo "Время: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Создаем директорию архива если не существует
mkdir -p "$ARCHIVE_DIR"

# Проверяем существование файла
if [ ! -f "$METRICS_LOG_FILE" ]; then
    echo "ℹ️  Файл логов не найден: $METRICS_LOG_FILE"
    echo "   Это нормально, если метрики еще не сохранялись"
    exit 0
fi

# Получаем размер файла до очистки
SIZE_BEFORE=$(du -h "$METRICS_LOG_FILE" | cut -f1)
echo "📊 Размер файла до очистки: $SIZE_BEFORE"

# Вычисляем дату отсечки
CUTOFF_DATE=$(date -d "$DAYS_TO_KEEP days ago" +"%Y-%m-%d" 2>/dev/null || date -v-${DAYS_TO_KEEP}d +"%Y-%m-%d" 2>/dev/null || date +"%Y-%m-%d")
CUTOFF_TIMESTAMP="${CUTOFF_DATE}T00:00:00.000Z"

echo "🗓️  Удаляем записи старше: $CUTOFF_DATE"
echo ""

# Используем jq для фильтрации (если установлен) или Python
if command -v jq &> /dev/null; then
    # Подсчитываем количество записей до очистки
    TOTAL_BEFORE=$(wc -l < "$METRICS_LOG_FILE" 2>/dev/null || echo 0)
    
    # Фильтруем записи новее даты отсечки
    jq -c --arg cutoff "$CUTOFF_TIMESTAMP" 'select(.timestamp >= $cutoff)' "$METRICS_LOG_FILE" > "${METRICS_LOG_FILE}.tmp" || true
    
    # Если есть новые записи, заменяем файл
    if [ -s "${METRICS_LOG_FILE}.tmp" ]; then
        TOTAL_AFTER=$(wc -l < "${METRICS_LOG_FILE}.tmp" 2>/dev/null || echo 0)
        REMOVED_COUNT=$((TOTAL_BEFORE - TOTAL_AFTER))
        mv "${METRICS_LOG_FILE}.tmp" "$METRICS_LOG_FILE"
        echo "   ✅ Удалено записей: $REMOVED_COUNT, оставлено: $TOTAL_AFTER"
    else
        # Если все записи старые, создаем пустой файл
        REMOVED_COUNT=$TOTAL_BEFORE
        > "$METRICS_LOG_FILE"
        echo "   ✅ Удалено всех записей: $REMOVED_COUNT (все были старше $DAYS_TO_KEEP дней)"
    fi
    rm -f "${METRICS_LOG_FILE}.tmp"
    
elif command -v python3 &> /dev/null; then
    # Используем Python для фильтрации
    python3 << EOF
import json
import sys
from datetime import datetime

cutoff = datetime.fromisoformat("$CUTOFF_TIMESTAMP".replace('Z', '+00:00'))
kept = []
removed = 0

try:
    with open("$METRICS_LOG_FILE", 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                record_date = datetime.fromisoformat(record['timestamp'].replace('Z', '+00:00'))
                if record_date >= cutoff:
                    kept.append(line)
                else:
                    removed += 1
            except (json.JSONDecodeError, KeyError, ValueError):
                continue
    
    # Записываем оставшиеся записи
    with open("$METRICS_LOG_FILE", 'w') as f:
        for line in kept:
            f.write(line + '\n')
    
    print(f"Удалено записей: {removed}")
    print(f"Оставлено записей: {len(kept)}")
except Exception as e:
    print(f"Ошибка: {e}", file=sys.stderr)
    sys.exit(1)
EOF
else
    echo "⚠️  jq или python3 не найдены. Используем простую очистку по размеру."
    
    # Простая ротация: архивируем если файл больше 100MB
    FILE_SIZE=$(stat -f%z "$METRICS_LOG_FILE" 2>/dev/null || stat -c%s "$METRICS_LOG_FILE" 2>/dev/null || echo 0)
    MAX_SIZE=$((100 * 1024 * 1024))  # 100 MB
    
    if [ $FILE_SIZE -gt $MAX_SIZE ]; then
        ARCHIVE_FILE="${ARCHIVE_DIR}/metrics-$(date +%Y%m%d-%H%M%S).jsonl.gz"
        echo "📦 Архивируем файл (размер: $(du -h "$METRICS_LOG_FILE" | cut -f1))"
        gzip -c "$METRICS_LOG_FILE" > "$ARCHIVE_FILE"
        > "$METRICS_LOG_FILE"
        echo "✅ Файл заархивирован: $ARCHIVE_FILE"
    else
        echo "ℹ️  Размер файла в норме, очистка не требуется"
    fi
fi

# Получаем размер файла после очистки
if [ -f "$METRICS_LOG_FILE" ]; then
    SIZE_AFTER=$(du -h "$METRICS_LOG_FILE" | cut -f1)
    echo ""
    echo "📊 Размер файла после очистки: $SIZE_AFTER"
fi

# Очищаем старые архивы (старше 90 дней)
if [ -d "$ARCHIVE_DIR" ]; then
    echo ""
    echo "🗑️  Очистка старых архивов (старше 90 дней)..."
    find "$ARCHIVE_DIR" -name "*.jsonl.gz" -mtime +90 -delete 2>/dev/null || true
    ARCHIVE_COUNT=$(find "$ARCHIVE_DIR" -name "*.jsonl.gz" 2>/dev/null | wc -l | tr -d ' ')
    echo "   Осталось архивов: $ARCHIVE_COUNT"
fi

echo ""
echo "✅ Очистка завершена"
echo "=========================================="

