# 🚀 Начните отсюда!

## Быстрая навигация

### Я хочу...

#### 🏃 Запустить локально
→ [QUICK_START_LOCAL.md](./deployment/QUICK_START_LOCAL.md)
```bash
docker-compose -f docker-compose.local.yml up
```

#### 📊 Проверить трафик
→ [HOW_TO_MONITOR_TRAFFIC.md](./monitoring/HOW_TO_MONITOR_TRAFFIC.md)
```bash
./scripts/monitoring/monitor-traffic.sh
```

#### 🧹 Настроить очистку логов
→ [QUICK_LOG_CLEANUP_SETUP.md](./cleanup/QUICK_LOG_CLEANUP_SETUP.md)
```bash
sudo ./scripts/setup-log-cleanup-cron.sh
```

#### 🖥️ Установить утилиты на VPS
→ [QUICK_VPS_TRAFFIC_SETUP.md](./monitoring/QUICK_VPS_TRAFFIC_SETUP.md)
```bash
sudo ./scripts/monitoring/install-vps-traffic-tools.sh
```

#### 🐳 Развернуть в продакшн
- Fedor: [UPDATE_PRODUCTION_FEDOR.md](./deployment/UPDATE_PRODUCTION_FEDOR.md)
- Bogdan: [DEPLOYMENT_BOGDAN.md](./deployment/DEPLOYMENT_BOGDAN.md)

#### 🔍 Найти нужный скрипт
→ [SCRIPTS_INDEX.md](./SCRIPTS_INDEX.md) — полный каталог всех скриптов

---

## 📚 Полный каталог

**Смотрите [SCRIPTS_INDEX.md](./SCRIPTS_INDEX.md)** для полного списка:
- Все скрипты с описаниями
- Вся документация
- Когда что использовать
- Типичные задачи

---

## 🎯 Основные разделы

### Мониторинг
- [METRICS_USAGE.md](./monitoring/METRICS_USAGE.md) - Метрики приложения
- [VPS_TRAFFIC_MONITORING.md](./monitoring/VPS_TRAFFIC_MONITORING.md) - Мониторинг на VPS

### Очистка
- [LOG_CLEANUP.md](./cleanup/LOG_CLEANUP.md) - Очистка логов

### Развертывание
- [UPDATE_PRODUCTION_FEDOR.md](./deployment/UPDATE_PRODUCTION_FEDOR.md) - Fedor
- [DEPLOYMENT_BOGDAN.md](./deployment/DEPLOYMENT_BOGDAN.md) - Bogdan

### Диагностика
- [DIAGNOSE_TRAFFIC_ISSUE.md](./general/DIAGNOSE_TRAFFIC_ISSUE.md) - Диагностика трафика
- [FIX_TRAFFIC_ISSUE.md](./general/FIX_TRAFFIC_ISSUE.md) - Исправление проблем

---

## 💡 Совет

Если не знаете, с чего начать — откройте [SCRIPTS_INDEX.md](./SCRIPTS_INDEX.md) и найдите нужную задачу в разделе "Типичные задачи".

