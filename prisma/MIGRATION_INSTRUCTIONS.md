# Инструкция по применению миграции для добавления HIGH_MMR значений в enum GameMode

## Важно
Эта миграция безопасна и не приводит к потере данных. Она только добавляет новые значения в enum `GameMode`.

## Вариант 1: Использование Prisma Migrate Deploy (Рекомендуется)

Если у вас есть доступ к серверу продакшена:

```bash
# Убедитесь, что DATABASE_URL указывает на продакшен базу
# В production окружении используйте .env.prod или установите переменные окружения

npx prisma migrate deploy
```

Эта команда:
- Применит все непримененные миграции
- Безопасно добавит новые значения в enum
- Обновит `_prisma_migrations` таблицу

## Вариант 2: Выполнение SQL напрямую

Если вы хотите выполнить миграцию напрямую в базе данных:

1. Подключитесь к продакшен базе данных PostgreSQL
2. Выполните SQL из файла миграции:

```sql
-- Add TWO_VS_TWO_HIGH_MMR value to GameMode enum
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TWO_VS_TWO_HIGH_MMR' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'GameMode')
    ) THEN
        ALTER TYPE "GameMode" ADD VALUE 'TWO_VS_TWO_HIGH_MMR';
    END IF;
END $$;

-- Add THREE_VS_THREE_HIGH_MMR value to GameMode enum
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'THREE_VS_THREE_HIGH_MMR' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'GameMode')
    ) THEN
        ALTER TYPE "GameMode" ADD VALUE 'THREE_VS_THREE_HIGH_MMR';
    END IF;
END $$;
```

3. После выполнения SQL, обновите таблицу миграций:

```sql
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    gen_random_uuid(),
    '',
    NOW(),
    '20251225164901_add_high_mmr_game_modes',
    NULL,
    NULL,
    NOW(),
    1
);
```

## Проверка

После применения миграции проверьте, что значения добавлены:

```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'GameMode')
ORDER BY enumsortorder;
```

Должны быть видны все значения:
- TWO_VS_TWO
- THREE_VS_THREE
- TWO_VS_TWO_VS_TWO
- TWO_VS_TWO_HIGH_MMR
- THREE_VS_THREE_HIGH_MMR

## Важные замечания

1. **Безопасность**: Добавление значений в enum не затрагивает существующие данные
2. **Блокировки**: Операция `ALTER TYPE ... ADD VALUE` может быть выполнена только вне транзакции в старых версиях PostgreSQL (до 12), но код с проверкой IF NOT EXISTS безопасен
3. **Порядок**: Новые значения будут добавлены в конец enum, что нормально

