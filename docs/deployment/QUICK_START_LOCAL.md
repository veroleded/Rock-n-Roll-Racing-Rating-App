# Быстрый старт для локального запуска

## Запуск через Docker Compose (без Nginx)

```bash
# 1. Убедитесь, что файл .env настроен
cp .env.example .env  # если нужно

# 2. Запустите контейнеры
docker-compose -f docker-compose.local.yml up -d

# 3. Проверьте статус
docker-compose -f docker-compose.local.yml ps

# 4. Просмотрите логи
docker-compose -f docker-compose.local.yml logs -f app
```

## Доступ к приложению

- **Приложение**: http://localhost:3000
- **Метрики**: http://localhost:3000/api/metrics
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Остановка

```bash
docker-compose -f docker-compose.local.yml down
```

## Очистка данных (если нужно)

```bash
# Остановить и удалить volumes
docker-compose -f docker-compose.local.yml down -v
```

## Просмотр метрик трафика

```bash
# Все метрики
curl http://localhost:3000/api/metrics

# Только исходящий трафик
curl http://localhost:3000/api/metrics | grep network_bytes_out_total

# Только входящий трафик
curl http://localhost:3000/api/metrics | grep network_bytes_in_total

# Подписки Redis
curl http://localhost:3000/api/metrics | grep redis_subscriptions_active
```

## Отличия от production

- Нет Nginx (прямой доступ к Next.js на порту 3000)
- Отдельные volumes (`postgres_data_local`, `redis_data_local`)
- Отдельные имена контейнеров (с суффиксом `_local`)

