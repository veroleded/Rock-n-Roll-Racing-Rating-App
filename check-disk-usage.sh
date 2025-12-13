#!/bin/bash

# Скрипт для проверки использования дискового пространства на сервере
# Использование: ./check-disk-usage.sh

echo "📊 Проверка использования дискового пространства..."
echo ""

# Общее использование диска
echo "💾 Общее использование диска:"
df -h
echo ""

# Использование Docker
echo "🐳 Использование Docker:"
docker system df
echo ""

# Размер Docker volumes
echo "📦 Размер Docker volumes:"
docker volume ls -q | xargs -r docker volume inspect | grep -E '"Mountpoint"|"Name"' | paste - - | awk '{print $4 " -> " $2}' | sed 's/"//g' | while read vol; do
  name=$(echo $vol | cut -d' ' -f1)
  path=$(echo $vol | cut -d' ' -f3)
  if [ -d "$path" ]; then
    size=$(du -sh "$path" 2>/dev/null | cut -f1)
    echo "  $name: $size"
  fi
done
echo ""

# Размер логов Docker
echo "📝 Размер Docker логов:"
if [ -d /var/lib/docker/containers ]; then
  du -sh /var/lib/docker/containers/*/ 2>/dev/null | sort -h | tail -10
else
  echo "  Логи Docker не найдены (возможно, используется другой драйвер)"
fi
echo ""

# Топ 10 самых больших директорий в проекте
echo "📁 Топ 10 самых больших директорий в проекте:"
du -h --max-depth=1 . 2>/dev/null | sort -rh | head -10
echo ""

# Размер .next папки (если есть)
if [ -d .next ]; then
  echo "🔨 Размер папки .next:"
  du -sh .next
  echo ""
fi

# Размер node_modules (если есть)
if [ -d node_modules ]; then
  echo "📚 Размер node_modules:"
  du -sh node_modules
  echo ""
fi

echo "✅ Проверка завершена!"

