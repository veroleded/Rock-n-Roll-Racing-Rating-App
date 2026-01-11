# Исправление проблемы с failed migrations в Prisma

## Проблема

Ошибка P3009: Prisma находит failed migrations в базе данных и не может применить новые миграции.

```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `20251225072205_init` migration started at 2025-12-27 12:24:30.813111 UTC failed
```

## Причина

В базе данных есть запись о failed migration `20251225072205_init`, которой нет в файловой системе. Это происходит, когда:
- Миграция была переименована или удалена
- Миграция была создана с другой датой/именем
- Произошла ошибка при применении миграции

## Решение

### Вариант 1: Автоматическое исправление (рекомендуется)

Используйте скрипт для автоматического исправления:

```bash
# Сделать скрипт исполняемым
chmod +x prisma/fix-migrations.sh

# Загрузить переменные окружения
source .env.prod  # или .env в зависимости от окружения

# Запустить скрипт
./prisma/fix-migrations.sh
```

Скрипт:
1. Покажет текущее состояние миграций в базе данных
2. Покажет failed migrations
3. Удалит записи о failed migrations (только после подтверждения)
4. Позволит применить миграции

### Вариант 2: Ручное исправление через SQL

Подключитесь к базе данных и выполните:

```sql
-- 1. Проверить текущие миграции
SELECT migration_name, started_at, finished_at, applied_steps_count, logs 
FROM "_prisma_migrations" 
ORDER BY started_at DESC;

-- 2. Найти failed migrations
SELECT migration_name, started_at, finished_at, logs 
FROM "_prisma_migrations" 
WHERE finished_at IS NULL;

-- 3. Удалить failed migrations (ОСТОРОЖНО!)
-- Убедитесь, что миграция не была применена частично
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251225072205_init' 
AND finished_at IS NULL;

-- 4. Проверить результат
SELECT migration_name, started_at, finished_at 
FROM "_prisma_migrations" 
ORDER BY started_at DESC;
```

### Вариант 3: Использование Prisma CLI (если доступно)

```bash
# Пометить failed migration как resolved
npx prisma migrate resolve --rolled-back 20251225072205_init

# Или пометить как applied (если миграция была применена)
npx prisma migrate resolve --applied 20251225072205_init
```

## После исправления

После удаления failed migrations примените миграции:

```bash
# Применить все pending migrations
npx prisma migrate deploy

# Или для продакшена
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

## Использование рабочих миграций из migrations.old

Если миграции из `migrations.old` рабочие, можно заменить текущие:

```bash
# Создать резервную копию текущих миграций
mv prisma/migrations prisma/migrations.backup

# Использовать рабочие миграции
cp -r prisma/migrations.old prisma/migrations

# Применить миграции
npx prisma migrate deploy
```

**⚠️ ВНИМАНИЕ:** Это безопасно только если:
- База данных еще не содержит данные из failed migrations
- Вы уверены, что миграции из `migrations.old` соответствуют текущей схеме

## Проверка после исправления

```bash
# Проверить статус миграций
npx prisma migrate status

# Проверить схему базы данных
npx prisma db pull

# Проверить, что все миграции применены
psql -U postgres -d rnr_racing_db -c "
SELECT migration_name, started_at, finished_at, applied_steps_count 
FROM \"_prisma_migrations\" 
ORDER BY started_at DESC;
"
```

## Предотвращение проблемы в будущем

1. **Всегда используйте версионный контроль** для миграций
2. **Не удаляйте миграции**, которые уже были применены
3. **Проверяйте миграции** перед применением в продакшене
4. **Делайте резервные копии** перед применением миграций
5. **Используйте `prisma migrate deploy`** в продакшене вместо `prisma migrate dev`

## Дополнительная информация

- [Prisma Migration Troubleshooting](https://www.prisma.io/docs/guides/migrate/troubleshooting-development)
- [Prisma Migration Resolve](https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-resolve)
