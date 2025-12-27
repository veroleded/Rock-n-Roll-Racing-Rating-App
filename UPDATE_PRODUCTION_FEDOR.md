# Инструкция по обновлению Production версии FEDOR

## Подготовка

1. **Подключитесь к серверу** где развернута версия fedor
2. **Перейдите в директорию проекта**:
   ```bash
   cd ~/Rock-n-Roll-Racing-Rating-App
   # или путь, где находится проект
   ```

## Шаг 1: Обновление кода

### Вариант A: Если проект в Git репозитории (рекомендуется)

```bash
# Сохраните текущее состояние (опционально, для отката)
git stash

# Получите последние изменения
git pull origin main
# или
git pull origin master

# Если были локальные изменения, восстановите их
git stash pop
```

### Вариант B: Если код обновляется вручную

```bash
# Скопируйте обновленные файлы на сервер
# Убедитесь, что все файлы обновлены, особенно:
# - prisma/schema.prisma
# - prisma/migrations/
# - src/
# - docker-compose.prod.fedor.yml
```

## Шаг 2: Проверка миграций

Убедитесь, что в директории `prisma/migrations/` есть следующие миграции:

1. `20251225164901_add_high_mmr_game_modes/migration.sql` - добавление HIGH_MMR значений в enum
2. `20251226100000_add_download_files/migration.sql` - создание таблицы DownloadFile

Проверьте:
```bash
ls -la prisma/migrations/
```

## Шаг 3: Применение миграций базы данных

### Вариант A: Автоматическое применение через Docker (рекомендуется)

Миграции применятся автоматически при перезапуске контейнера, так как в `docker-compose.prod.fedor.yml` есть команда:
```yaml
npx prisma migrate deploy
```

Просто перезапустите контейнеры:
```bash
docker-compose -f docker-compose.prod.fedor.yml down
docker-compose -f docker-compose.prod.fedor.yml up -d
```

### Вариант B: Ручное применение миграций

Если нужно применить миграции вручную:

```bash
# Войдите в контейнер приложения
docker exec -it rnr_racing_app_fedor sh

# Примените миграции
npx prisma migrate deploy

# Сгенерируйте Prisma Client
npx prisma generate

# Выйдите из контейнера
exit
```

### Вариант C: Прямое выполнение SQL (если миграции не работают)

Если автоматическое применение не работает, выполните SQL напрямую:

```bash
# Подключитесь к базе данных
docker exec -it rnr_racing_db_fedor psql -U postgres -d your_database_name
```

Затем выполните SQL из миграций:

#### 3.1. Добавление HIGH_MMR значений в enum GameMode

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

#### 3.2. Создание таблицы DownloadFile

```sql
-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('GAME', 'EMULATOR');

-- CreateTable
CREATE TABLE IF NOT EXISTS "download_files" (
    "id" TEXT NOT NULL,
    "type" "FileType" NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT NOT NULL,

    CONSTRAINT "download_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "download_files_type_key" ON "download_files"("type");
```

После выполнения SQL обновите таблицу миграций (опционально, если используете Prisma):

```sql
-- Для миграции HIGH_MMR
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
) ON CONFLICT DO NOTHING;

-- Для миграции DownloadFile
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    gen_random_uuid(),
    '',
    NOW(),
    '20251226100000_add_download_files',
    NULL,
    NULL,
    NOW(),
    1
) ON CONFLICT DO NOTHING;
```

## Шаг 4: Пересборка и перезапуск контейнеров

```bash
# Остановите текущие контейнеры
docker-compose -f docker-compose.prod.fedor.yml down

# Пересоберите образ приложения (если код изменился)
docker-compose -f docker-compose.prod.fedor.yml build app

# Запустите контейнеры заново
docker-compose -f docker-compose.prod.fedor.yml up -d

# Проверьте логи, что все запустилось корректно
docker-compose -f docker-compose.prod.fedor.yml logs -f app
```

## Шаг 5: Проверка

### 5.1. Проверка миграций

```bash
# Войдите в контейнер приложения
docker exec -it rnr_racing_app_fedor sh

# Проверьте статус миграций
npx prisma migrate status

# Выйдите из контейнера
exit
```

### 5.2. Проверка базы данных

```bash
# Подключитесь к базе данных
docker exec -it rnr_racing_db_fedor psql -U postgres -d your_database_name
```

Проверьте enum GameMode:
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

Проверьте таблицу DownloadFile:
```sql
SELECT * FROM download_files;
-- Должна существовать, даже если пустая
```

Проверьте enum FileType:
```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'FileType')
ORDER BY enumsortorder;
```

Должны быть:
- GAME
- EMULATOR

### 5.3. Проверка работы приложения

1. Откройте браузер и перейдите на `http://80.76.34.5`
2. Проверьте, что приложение загружается
3. Проверьте функциональность (если есть доступ)

## Шаг 6: Проверка логов

```bash
# Логи приложения
docker-compose -f docker-compose.prod.fedor.yml logs app

# Логи базы данных
docker-compose -f docker-compose.prod.fedor.yml logs postgres

# Логи Nginx
docker-compose -f docker-compose.prod.fedor.yml logs nginx
```

## Откат изменений (если что-то пошло не так)

Если нужно откатить изменения:

```bash
# Остановите контейнеры
docker-compose -f docker-compose.prod.fedor.yml down

# Откатите код (если использовали Git)
git reset --hard HEAD~1
# или
git checkout <previous-commit-hash>

# Запустите снова
docker-compose -f docker-compose.prod.fedor.yml up -d
```

**Внимание**: Откат миграций базы данных может быть сложным. Если нужно удалить таблицу DownloadFile:

```sql
DROP TABLE IF EXISTS "download_files";
DROP TYPE IF EXISTS "FileType";
```

Удаление значений из enum невозможно напрямую в PostgreSQL, но это не критично, так как они не используются в существующих данных.

## Важные замечания

1. **Резервное копирование**: Перед обновлением рекомендуется сделать бэкап базы данных:
   ```bash
   docker exec rnr_racing_db_fedor pg_dump -U postgres your_database_name > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Время простоя**: Обновление займет несколько минут, в течение которых приложение будет недоступно

3. **Проверка переменных окружения**: Убедитесь, что в `.env.prod` установлены правильные значения:
   - `VERSION=fedor`
   - `NEXT_PUBLIC_VERSION=fedor`
   - `DATABASE_URL=...`
   - И другие необходимые переменные

4. **Порты**: Если на сервере запущены обе версии (bogdan и fedor), убедитесь, что порты не конфликтуют

## Поддержка

Если возникли проблемы:
1. Проверьте логи контейнеров
2. Проверьте статус миграций
3. Убедитесь, что все файлы обновлены
4. Проверьте переменные окружения

