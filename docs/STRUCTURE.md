# 📁 Структура проекта

## Обзор

Проект организован в следующей структуре:

```
discord-bot-new/
├── docs/                      # Вся документация
│   ├── monitoring/           # Документация по мониторингу
│   ├── deployment/            # Документация по развертыванию
│   ├── ssl/                   # Документация по SSL
│   ├── migrations/            # Документация по миграциям
│   ├── cleanup/              # Документация по очистке
│   ├── general/              # Общая документация
│   ├── SCRIPTS_INDEX.md      # Индекс всех скриптов
│   └── START_HERE.md         # Быстрый старт
│
├── scripts/                   # Все скрипты
│   ├── monitoring/           # Скрипты мониторинга
│   ├── deployment/           # Скрипты развертывания
│   ├── analysis/             # Скрипты анализа
│   ├── ssl/                  # Скрипты SSL
│   ├── migrations/           # Скрипты миграций
│   ├── cleanup/              # Скрипты очистки
│   ├── setup-log-cleanup-cron.sh
│   └── wait-for-postgres.sh
│
├── logs/                      # Логи (создается автоматически)
│   ├── metrics/              # Логи метрик
│   └── cleanup.log           # Логи очистки
│
└── [остальные файлы проекта]
```

## Детальная структура

### 📚 docs/

#### docs/monitoring/

- `METRICS_USAGE.md` - Использование метрик
- `METRICS_STORAGE.md` - Хранение метрик
- `HOW_TO_MONITOR_TRAFFIC.md` - Мониторинг трафика
- `VPS_TRAFFIC_MONITORING.md` - Мониторинг на VPS
- `QUICK_VPS_TRAFFIC_SETUP.md` - Быстрая настройка

#### docs/deployment/

- `UPDATE_PRODUCTION_FEDOR.md` - Обновление fedor
- `DEPLOYMENT_BOGDAN.md` - Развертывание bogdan
- `QUICK_START_LOCAL.md` - Локальный запуск
- `QUICK_START_BOGDAN.md` - Быстрый старт bogdan

#### docs/ssl/

- `SSL_SETUP_BOGDAN.md` - Настройка SSL
- `SSL_QUICK_REFERENCE.md` - Быстрая справка
- `AUTO_RENEW_SSL.md` - Автообновление SSL

#### docs/migrations/

- `FIX_MIGRATION_FEDOR.md` - Исправление миграций
- `FIX_MIGRATION_STEP_BY_STEP.md` - Пошаговое руководство

#### docs/cleanup/

- `LOG_CLEANUP.md` - Очистка логов
- `QUICK_LOG_CLEANUP_SETUP.md` - Быстрая настройка

#### docs/general/

- `DIAGNOSE_TRAFFIC_ISSUE.md` - Диагностика трафика
- `FIX_TRAFFIC_ISSUE.md` - Исправление проблем
- `HOW_TO_ANALYZE_TRAFFIC.md` - Анализ трафика
- `HOW_TO_CHECK_HISTORICAL_LOGS.md` - Исторические логи
- `QUICK_FIX_SUMMARY.md` - Краткое резюме

### 🔧 scripts/

#### scripts/monitoring/

- `monitor-traffic.sh` - Разовый просмотр трафика
- `monitor-traffic-continuous.sh` - Непрерывный мониторинг
- `view-metrics-history.sh` - История метрик
- `check-vps-traffic.sh` - Проверка трафика VPS
- `install-vps-traffic-tools.sh` - Установка утилит

#### scripts/deployment/

- `update-fedor-production.sh` - Обновление fedor

#### scripts/analysis/

- `analyze-traffic.sh` - Анализ трафика
- `analyze-nginx-logs.sh` - Анализ Nginx
- `analyze-historical-logs.sh` - Исторические логи
- `check-suspicious-activity.sh` - Подозрительная активность
- `find-traffic-peak.sh` - Поиск пиков
- `export-logs-for-analysis.sh` - Экспорт логов

#### scripts/ssl/

- `scripts/ssl/check-ssl.sh` - Проверка SSL
- `scripts/ssl/renew-ssl.sh` - Обновление SSL

#### scripts/migrations/

- `fix-migrations-fedor.sh` - Исправление миграций
- `fix-migrations-fedor-v2.sh` - Альтернативный способ
- `quick-fix-migration.sh` - Быстрое исправление

#### scripts/cleanup/

- `cleanup-metrics-logs.sh` - Очистка метрик
- `cleanup-all-logs.sh` - Очистка всех логов

## Навигация

- **Начать работу:** [START_HERE.md](./START_HERE.md)
- **Найти скрипт:** [SCRIPTS_INDEX.md](./SCRIPTS_INDEX.md)
- **Миграция на сервере:** [SERVER_MIGRATION_GUIDE.md](./SERVER_MIGRATION_GUIDE.md)
