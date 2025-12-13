#!/bin/bash

# Скрипт для детального анализа использования дискового пространства
# Использование: ./check-what-uses-space.sh

echo "🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ИСПОЛЬЗОВАНИЯ ДИСКА"
echo "========================================"
echo ""

# Общее использование
echo "📊 Общее использование диска:"
df -h /
echo ""

# Docker использование
echo "🐳 Использование Docker:"
docker system df -v 2>/dev/null || echo "Docker не запущен или недоступен"
echo ""

# Размер Docker директорий
echo "📦 Размер директорий Docker:"
if [ -d /var/lib/docker ]; then
  echo "  /var/lib/docker:"
  du -sh /var/lib/docker/* 2>/dev/null | sort -rh | head -10
fi
echo ""

# Размер логов Docker
echo "📝 Размер логов Docker:"
if [ -d /var/lib/docker/containers ]; then
  TOTAL_LOG_SIZE=$(du -sh /var/lib/docker/containers 2>/dev/null | cut -f1)
  echo "  Общий размер логов: $TOTAL_LOG_SIZE"
  echo ""
  echo "  Топ-20 самых больших лог-файлов:"
  find /var/lib/docker/containers -name "*.log" -type f -exec du -h {} + 2>/dev/null | sort -rh | head -20
fi
echo ""

# Размер volumes
echo "💾 Размер Docker volumes:"
docker volume ls -q 2>/dev/null | while read vol; do
  size=$(docker run --rm -v "$vol:/data" alpine sh -c "du -sh /data 2>/dev/null | cut -f1" 2>/dev/null || echo "недоступно")
  echo "  $vol: $size"
done
echo ""

# Размер образов
echo "🖼️  Размер Docker образов:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" 2>/dev/null | head -20
echo ""

# Системные логи
echo "📋 Размер системных логов:"
if [ -d /var/log ]; then
  du -sh /var/log/* 2>/dev/null | sort -rh | head -10
fi
echo ""

# Топ-10 самых больших директорий в корне
echo "📁 Топ-10 самых больших директорий в корневой файловой системе:"
du -h --max-depth=1 / 2>/dev/null | sort -rh | head -10
echo ""

# Проверка конкретных больших директорий
echo "🔎 Детальный анализ больших директорий:"
for dir in /var/lib/docker /var/log /tmp /var/tmp /home /root; do
  if [ -d "$dir" ]; then
    size=$(du -sh "$dir" 2>/dev/null | cut -f1)
    echo "  $dir: $size"
  fi
done
echo ""

# Если есть проект, проверяем его размер
PROJECT_DIR="/root/Rock-n-Roll-Racing-Rating-App"
if [ -d "$PROJECT_DIR" ]; then
  echo "📂 Размер проекта:"
  du -sh "$PROJECT_DIR" 2>/dev/null
  echo ""
  echo "  Детализация проекта:"
  du -sh "$PROJECT_DIR"/* 2>/dev/null | sort -rh | head -10
fi
echo ""

echo "✅ Анализ завершен!"

