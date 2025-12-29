# Быстрая установка мониторинга трафика на VPS

## Быстрый старт

### 1. Установка всех утилит одной командой

```bash
# Скопируйте скрипт на сервер и запустите
sudo ./scripts/monitoring/install-vps-traffic-tools.sh
```

Или вручную:

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y vnstat vnstati iftop nethogs nload

# CentOS/RHEL
sudo yum install -y epel-release
sudo yum install -y vnstat vnstati iftop nethogs nload
```

### 2. Инициализация vnstat (сохранение истории)

```bash
# Определить интерфейс
ip addr show

# Инициализировать (замените eth0 на ваш интерфейс)
sudo vnstat -i eth0

# Запустить сервис
sudo systemctl enable vnstat
sudo systemctl start vnstat
```

### 3. Проверка трафика

```bash
# Быстрая проверка (используйте скрипт)
./scripts/monitoring/check-vps-traffic.sh

# Или вручную:
vnstat                    # Текущая статистика
vnstat -d                 # За день
sudo iftop -i eth0       # В реальном времени
sudo nethogs             # По процессам
```

## Основные команды

### vnstat - Статистика с историей

```bash
vnstat              # Текущая статистика
vnstat -d            # За день
vnstat -m            # За месяц
vnstat -h            # По часам
vnstat --json        # Экспорт в JSON
```

### iftop - Реальное время

```bash
sudo iftop -i eth0           # Мониторинг интерфейса
sudo iftop -i eth0 -P        # С портами
sudo iftop -i eth0 -o 2s     # Только исходящий
```

### nethogs - По процессам

```bash
sudo nethogs                # Все интерфейсы
sudo nethogs eth0           # Конкретный интерфейс
```

## Автоматические проверки

### Ежедневный отчет

```bash
# Создать скрипт
sudo nano /usr/local/bin/daily-traffic-report.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
echo "=== Отчет о трафике за $DATE ==="
vnstat -d
vnstat -m
```

```bash
sudo chmod +x /usr/local/bin/daily-traffic-report.sh

# Добавить в cron (каждый день в 00:00)
sudo crontab -e
# Добавить:
0 0 * * * /usr/local/bin/daily-traffic-report.sh >> /var/log/traffic-report.log
```

### Алерт при высоком трафике

```bash
# Создать скрипт
sudo nano /usr/local/bin/traffic-alert.sh
```

```bash
#!/bin/bash
THRESHOLD=10737418240  # 10 GB в байтах
TRAFFIC=$(vnstat -d --json | jq -r '.interfaces[0].traffic.days[0].tx // 0')

if [ $TRAFFIC -gt $THRESHOLD ]; then
    TRAFFIC_GB=$(echo "scale=2; $TRAFFIC/1073741824" | bc)
    echo "⚠️  ВНИМАНИЕ: Высокий трафик: ${TRAFFIC_GB} GB"
    echo "$(date): High traffic: ${TRAFFIC_GB} GB" >> /var/log/traffic-alerts.log
fi
```

```bash
sudo chmod +x /usr/local/bin/traffic-alert.sh

# Проверка каждые 5 минут
sudo crontab -e
# Добавить:
*/5 * * * * /usr/local/bin/traffic-alert.sh
```

## Что использовать когда

- **Постоянный мониторинг:** `vnstat` - сохраняет историю, не требует постоянного запуска
- **Поиск проблемы:** `nethogs` - показывает какой процесс использует трафик
- **Реальное время:** `iftop` или `nload` - визуальный мониторинг
- **Быстрая проверка:** `./scripts/monitoring/check-vps-traffic.sh` - все в одном

## Дополнительная информация

Подробная документация: [VPS_TRAFFIC_MONITORING.md](./VPS_TRAFFIC_MONITORING.md)
