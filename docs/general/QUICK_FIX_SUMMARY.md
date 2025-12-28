# Краткая инструкция по исправлению проблемы с трафиком

## Что было исправлено:

1. ✅ **Next.js обновлен** с 15.1.7 на 15.1.9 (исправляет уязвимость)
2. ✅ **Добавлена защита от множественного запуска бота** (`src/bot/singleton.ts`)
3. ✅ **Добавлено ограничение переподключений Discord** (максимум 5 попыток)
4. ✅ **Исправлена утечка подписок в match-events.ts** (добавлена защита от дубликатов)

## Что нужно сделать на сервере:

```bash
# 1. Обновить код (если через Git)
git pull

# 2. Обновить зависимости
npm install

# 3. Пересобрать Docker образ
docker-compose -f docker-compose.prod.bogdan.yml build app

# 4. Перезапустить контейнеры
docker-compose -f docker-compose.prod.bogdan.yml down
docker-compose -f docker-compose.prod.bogdan.yml up -d

# 5. Проверить логи
docker-compose -f docker-compose.prod.bogdan.yml logs -f app
```

## Что проверить в логах:

Должно быть видно:
- `[Bot Singleton] Защита от множественного запуска активирована`
- `[Redis Match] Подписан на события MATCH_CREATED` (только ОДИН раз!)
- `[Redis] Подписан на события QUEUE_CLEANED` (только ОДИН раз!)

**ВАЖНО:** Если видите эти сообщения несколько раз, значит проблема не решена.

## Мониторинг:

```bash
# Использование ресурсов
docker stats rnr_racing_app_bogdan

# Сетевая активность (установите iftop)
sudo apt install iftop
sudo iftop -i eth0
```

После исправлений трафик должен быть нормальным (несколько МБ/час, а не ГБ).

