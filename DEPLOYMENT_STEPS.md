# Инструкция по применению изменений на продакшн сервере

## Шаги для применения оптимизаций

### 1. Подготовка (на локальной машине)

Убедитесь, что все изменения закоммичены и запушены в репозиторий:

```bash
git add .
git commit -m "Оптимизация использования дискового пространства"
git push
```

### 2. Подключение к серверу

Подключитесь к вашему VPS серверу:

```bash
ssh user@your-server-ip
```

### 3. Переход в директорию проекта

```bash
cd /path/to/Rock-n-Roll-Racing-Rating-App
```

### 4. Обновление кода с репозитория

```bash
git pull origin main  # или master, в зависимости от вашей ветки
```

### 5. Проверка текущего использования диска (перед изменениями)

```bash
# Сделайте скрипт исполняемым
chmod +x check-disk-usage.sh

# Проверьте текущее состояние
./check-disk-usage.sh
```

Сохраните результаты для сравнения после оптимизации.

### 6. Остановка текущих контейнеров

```bash
docker-compose -f docker-compose.prod.yml down
```

### 7. Очистка старых Docker ресурсов (освободит место)

```bash
# Сделайте скрипт исполняемым
chmod +x cleanup-docker.sh

# Запустите безопасную очистку (volumes НЕ будут удалены)
./cleanup-docker.sh
```

Это освободит место от старых образов, контейнеров и build cache.

### 8. Пересборка и запуск контейнеров с новыми настройками

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

Это:
- Пересоберет образы с оптимизированным Dockerfile
- Применит ограничения на логи
- Создаст volume для кэширования сборки Next.js

### 9. Проверка работы приложения

```bash
# Проверьте статус контейнеров
docker-compose -f docker-compose.prod.yml ps

# Проверьте логи (должны быть ограничены по размеру)
docker-compose -f docker-compose.prod.yml logs --tail=50 app

# Проверьте, что приложение доступно
curl http://localhost  # или ваш домен
```

### 10. Проверка использования диска (после изменений)

```bash
./check-disk-usage.sh
```

Сравните результаты с шагом 5.

### 11. (Опционально) Очистка старых данных из базы

⚠️ **ВАЖНО:** Перед этим шагом сделайте резервную копию базы данных!

```bash
# Создайте резервную копию базы данных
docker exec rnr_racing_db pg_dump -U postgres your_database_name > backup_$(date +%Y%m%d_%H%M%S).sql

# Проверьте, что будет удалено (режим просмотра)
docker exec rnr_racing_app npm run cleanup-old-data -- --dry-run

# Если все в порядке, выполните реальную очистку
docker exec rnr_racing_app npm run cleanup-old-data
```

### 12. Настройка автоматической очистки (рекомендуется)

Добавьте в crontab для автоматической очистки:

```bash
crontab -e
```

Добавьте следующие строки:

```cron
# Очистка Docker ресурсов каждую неделю (воскресенье в 3:00)
0 3 * * 0 cd /path/to/Rock-n-Roll-Racing-Rating-App && ./cleanup-docker.sh

# Проверка использования диска каждый день (в 2:00)
0 2 * * * cd /path/to/Rock-n-Roll-Racing-Rating-App && ./check-disk-usage.sh >> /var/log/disk-usage.log 2>&1
```

## Проверка результатов

После применения всех изменений вы должны увидеть:

1. ✅ Ограниченные логи Docker (максимум ~30MB на сервис)
2. ✅ Меньший размер Docker образов
3. ✅ Кэширование сборки Next.js (быстрее перезапуск)
4. ✅ Освобожденное место от старых Docker ресурсов
5. ✅ (Опционально) Очищенные старые данные из базы

## Мониторинг в будущем

### Еженедельно:
```bash
./cleanup-docker.sh
./check-disk-usage.sh
```

### Ежемесячно:
```bash
# После резервной копии!
docker exec rnr_racing_app npm run cleanup-old-data
```

## Если что-то пошло не так

### Откат изменений:

```bash
# Остановить контейнеры
docker-compose -f docker-compose.prod.yml down

# Вернуться к предыдущей версии
git checkout HEAD~1  # или конкретный коммит

# Перезапустить
docker-compose -f docker-compose.prod.yml up -d --build
```

### Проверка логов при проблемах:

```bash
# Логи приложения
docker-compose -f docker-compose.prod.yml logs app

# Логи базы данных
docker-compose -f docker-compose.prod.yml logs postgres

# Логи nginx
docker-compose -f docker-compose.prod.yml logs nginx
```

## Дополнительные команды для диагностики

```bash
# Размер всех Docker volumes
docker volume ls -q | xargs docker volume inspect | grep -E '"Mountpoint"|"Name"'

# Размер логов Docker
sudo du -sh /var/lib/docker/containers/*/

# Общее использование Docker
docker system df

# Использование диска системой
df -h
```

