# Автоматическая очистка логов

## Обзор

Система автоматической очистки логов предотвращает заполнение диска старыми логами и метриками.

## Что очищается

### 1. Логи метрик (`logs/metrics/metrics.jsonl`)
- **Частота:** Каждый день в 2:00
- **Хранение:** Последние 30 дней
- **Архивация:** Старые записи архивируются в `logs/metrics/archive/`
- **Удаление архивов:** Старше 90 дней

### 2. Все логи приложения
- **Частота:** Каждую неделю (воскресенье) в 3:00
- **Что очищается:**
  - Логи приложения старше 30 дней
  - Временные файлы
  - Старые архивы

## Быстрая настройка

### Автоматическая настройка (рекомендуется)

```bash
# На VPS сервере
sudo ./scripts/setup-log-cleanup-cron.sh
```

Скрипт автоматически:
- Настроит cron задачи для очистки
- Создаст необходимые директории
- Настроит права доступа

### Ручная настройка

```bash
# Открыть crontab
crontab -e

# Добавить строки:
# Очистка логов метрик (каждый день в 2:00)
0 2 * * * cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup/cleanup-metrics-logs.sh 30 >> logs/cleanup.log 2>&1

# Очистка всех логов (каждую неделю в воскресенье в 3:00)
0 3 * * 0 cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup/cleanup-all-logs.sh >> logs/cleanup.log 2>&1
```

## Ручной запуск

### Очистка только логов метрик

```bash
# Очистить, оставив последние 30 дней
./scripts/cleanup/cleanup-metrics-logs.sh 30

# Очистить, оставив последние 7 дней
./scripts/cleanup/cleanup-metrics-logs.sh 7

# Очистить, оставив последние 90 дней
./scripts/cleanup/cleanup-metrics-logs.sh 90
```

### Очистка всех логов

```bash
./scripts/cleanup/cleanup-all-logs.sh
```

## Настройка параметров

### Изменить период хранения метрик

Отредактируйте cron задачу:
```bash
crontab -e
```

Измените число дней в команде:
```bash
# Было: 30 дней
0 2 * * * cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup/cleanup-metrics-logs.sh 30

# Стало: 60 дней
0 2 * * * cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup/cleanup-metrics-logs.sh 60
```

### Изменить расписание

Формат cron: `минута час день месяц день_недели`

Примеры:
```bash
# Каждый день в 3:00
0 3 * * *

# Каждые 3 дня в 1:00
0 1 */3 * *

# Каждый понедельник в 4:00
0 4 * * 1

# Дважды в день (в 2:00 и 14:00)
0 2,14 * * *
```

## Проверка работы

### Просмотр cron задач

```bash
# Все задачи текущего пользователя
crontab -l

# Задачи конкретного пользователя
crontab -u username -l
```

### Просмотр логов очистки

```bash
# Последние записи
tail -f logs/cleanup.log

# Поиск ошибок
grep -i error logs/cleanup.log

# Статистика запусков
grep "Очистка завершена" logs/cleanup.log | wc -l
```

### Тестовый запуск

```bash
# Запустить очистку вручную для проверки
./scripts/cleanup/cleanup-metrics-logs.sh 30

# Проверить результат
ls -lh logs/metrics/
tail -20 logs/cleanup.log
```

## Архивация

Старые логи метрик автоматически архивируются в `logs/metrics/archive/`:

```bash
# Просмотр архивов
ls -lh logs/metrics/archive/

# Распаковка архива
gunzip logs/metrics/archive/metrics-20251228-020000.jsonl.gz

# Просмотр содержимого
zcat logs/metrics/archive/metrics-20251228-020000.jsonl.gz | head -5
```

## Мониторинг использования диска

### Проверка размера логов

```bash
# Размер директории логов
du -sh logs/

# Размер логов метрик
du -sh logs/metrics/

# Размер архивов
du -sh logs/metrics/archive/

# Детальная статистика
du -h logs/ | sort -h
```

### Настройка алертов

Создайте скрипт для проверки размера:

```bash
#!/bin/bash
# check-disk-usage.sh

THRESHOLD=1073741824  # 1 GB в байтах
LOGS_SIZE=$(du -sb logs/ | cut -f1)

if [ $LOGS_SIZE -gt $THRESHOLD ]; then
    SIZE_GB=$(echo "scale=2; $LOGS_SIZE/1073741824" | bc)
    echo "⚠️  ВНИМАНИЕ: Размер логов превышает 1 GB: ${SIZE_GB} GB"
    # Отправить уведомление
fi
```

Добавьте в cron:
```bash
# Проверка каждый час
0 * * * * /root/Rock-n-Roll-Racing-Rating-App/scripts/cleanup/check-disk-usage.sh
```

## Устранение проблем

### Cron задачи не выполняются

1. Проверьте права на скрипты:
```bash
ls -l scripts/cleanup-*.sh
chmod +x scripts/cleanup-*.sh
```

2. Проверьте путь в cron:
```bash
# Используйте абсолютные пути
/root/Rock-n-Roll-Racing-Rating-App/scripts/cleanup/cleanup-metrics-logs.sh
```

3. Проверьте логи cron:
```bash
# Системные логи cron
sudo tail -f /var/log/syslog | grep CRON

# Или
sudo journalctl -u cron -f
```

### Скрипты не находят файлы

Убедитесь, что скрипты запускаются из корня проекта:
```bash
# В cron задаче используйте cd
cd /root/Rock-n-Roll-Racing-Rating-App && bash scripts/cleanup/cleanup-metrics-logs.sh
```

### Недостаточно прав

```bash
# Проверьте права на директорию логов
ls -ld logs/
chmod 755 logs/
chown -R user:user logs/
```

## Рекомендации

1. **Период хранения:** 30 дней достаточно для большинства случаев
2. **Архивация:** Включена по умолчанию для важных данных
3. **Мониторинг:** Настройте алерты при превышении размера
4. **Резервное копирование:** Периодически архивируйте важные логи

## Отключение автоматической очистки

```bash
# Удалить cron задачи
crontab -e
# Удалите строки с cleanup-*.sh

# Или удалить все задачи очистки
crontab -l | grep -v cleanup | crontab -
```

## Дополнительная информация

- Скрипты находятся в `scripts/`
- Логи очистки: `logs/cleanup.log`
- Архивы метрик: `logs/metrics/archive/`

