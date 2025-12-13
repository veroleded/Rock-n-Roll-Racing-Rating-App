#!/bin/bash

# Скрипт для очистки неиспользуемых Docker ресурсов
# Использование: ./cleanup-docker.sh [--with-volumes]
# 
# ВНИМАНИЕ: По умолчанию volumes НЕ удаляются для защиты данных базы!
# Используйте --with-volumes только если уверены, что не удалите важные данные.

echo "🧹 Начинаем очистку Docker ресурсов..."

# Проверка флага для удаления volumes
WITH_VOLUMES=false
if [[ "$1" == "--with-volumes" ]]; then
  WITH_VOLUMES=true
  echo "⚠️  ВНИМАНИЕ: Будет выполнена очистка volumes!"
  echo "⚠️  Убедитесь, что важные volumes (например, postgres_data) не будут удалены!"
  read -p "Продолжить? (yes/no): " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "❌ Отменено пользователем"
    exit 1
  fi
fi

# Остановить и удалить неиспользуемые контейнеры
echo "📦 Удаление остановленных контейнеров..."
docker container prune -f

# Удалить неиспользуемые образы
echo "🖼️  Удаление неиспользуемых образов..."
docker image prune -a -f

# Удалить неиспользуемые volumes (только если явно указано)
if [[ "$WITH_VOLUMES" == "true" ]]; then
  echo "💾 Удаление неиспользуемых volumes..."
  echo "⚠️  Пропускаем важные volumes: postgres_data, next_build_cache"
  
  # Получаем список всех volumes
  ALL_VOLUMES=$(docker volume ls -q)
  
  # Удаляем только те volumes, которые не являются важными
  for volume in $ALL_VOLUMES; do
    if [[ "$volume" != "postgres_data" && "$volume" != "next_build_cache" ]]; then
      # Проверяем, используется ли volume
      if ! docker ps -a --filter volume="$volume" --format "{{.Names}}" | grep -q .; then
        echo "  Удаляем неиспользуемый volume: $volume"
        docker volume rm "$volume" 2>/dev/null || true
      else
        echo "  Пропускаем используемый volume: $volume"
      fi
    else
      echo "  Пропускаем важный volume: $volume"
    fi
  done
else
  echo "💾 Пропуск очистки volumes (используйте --with-volumes для включения)"
  echo "   Защищенные volumes: postgres_data, next_build_cache"
fi

# Удалить неиспользуемые сети
echo "🌐 Удаление неиспользуемых сетей..."
docker network prune -f

# Очистить build cache
echo "🗑️  Очистка build cache..."
docker builder prune -a -f

# Показать освобожденное место
echo ""
echo "✅ Очистка завершена!"
echo ""
echo "📊 Текущее использование Docker:"
docker system df

# Показать информацию о volumes
echo ""
echo "💾 Информация о volumes:"
docker volume ls
echo ""
echo "📦 Размер volumes:"
docker volume ls -q | while read vol; do
  if [[ "$vol" == "postgres_data" || "$vol" == "next_build_cache" ]]; then
    size=$(docker run --rm -v "$vol:/data" alpine sh -c "du -sh /data 2>/dev/null | cut -f1" 2>/dev/null || echo "недоступно")
    echo "  $vol: $size"
  fi
done

