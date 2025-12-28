# Мониторинг трафика на VPS сервере

## Рекомендуемые утилиты

### 1. vnstat (рекомендуется) - Статистика трафика с историей

**Установка:**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install vnstat vnstati

# CentOS/RHEL
sudo yum install vnstat vnstati
```

**Настройка:**

```bash
# Определить сетевой интерфейс (обычно eth0, ens3, или enp0s3)
ip addr show

# Инициализировать vnstat для интерфейса
sudo vnstat -i eth0  # замените eth0 на ваш интерфейс

# Запустить сервис
sudo systemctl enable vnstat
sudo systemctl start vnstat
```

**Использование:**

```bash
# Текущая статистика
vnstat

# Статистика за сегодня
vnstat -d

# Статистика за месяц
vnstat -m

# Статистика за час
vnstat -h

# Экспорт в JSON
vnstat --json

# Постоянный мониторинг (обновление каждые 2 секунды)
watch -n 2 vnstat
```

**Автоматические отчеты:**

```bash
# Создать скрипт для ежедневного отчета
sudo nano /usr/local/bin/traffic-report.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
REPORT="/var/log/traffic-report-${DATE}.txt"

echo "=== Отчет о трафике за $DATE ===" > $REPORT
echo "" >> $REPORT
vnstat -d >> $REPORT
echo "" >> $REPORT
vnstat -m >> $REPORT

# Отправить на email (если настроен)
# mail -s "Traffic Report $DATE" your@email.com < $REPORT
```

```bash
sudo chmod +x /usr/local/bin/traffic-report.sh

# Добавить в cron для ежедневного отчета
sudo crontab -e
# Добавить строку:
0 0 * * * /usr/local/bin/traffic-report.sh
```

### 2. iftop - Мониторинг трафика в реальном времени

**Установка:**

```bash
# Ubuntu/Debian
sudo apt install iftop

# CentOS/RHEL
sudo yum install iftop
```

**Использование:**

```bash
# Мониторинг интерфейса
sudo iftop -i eth0

# Показать порты
sudo iftop -i eth0 -P

# Показать только исходящий трафик
sudo iftop -i eth0 -o 2s

# Фильтр по IP
sudo iftop -i eth0 -f "host 192.168.1.1"
```

**Горячие клавиши в iftop:**

- `h` - помощь
- `n` - разрешить/запретить DNS
- `s` - показать исходный порт
- `d` - показать порт назначения
- `t` - переключить вид (1/2/3 линии)
- `j/k` - прокрутка
- `q` - выход

### 3. nethogs - Трафик по процессам

**Установка:**

```bash
# Ubuntu/Debian
sudo apt install nethogs

# CentOS/RHEL
sudo yum install nethogs
```

**Использование:**

```bash
# Мониторинг всех интерфейсов
sudo nethogs

# Мониторинг конкретного интерфейса
sudo nethogs eth0

# Обновление каждые 2 секунды
sudo nethogs -d 2
```

Показывает трафик по процессам - очень полезно для поиска "виновника" высокого трафика!

### 4. nload - Простой монитор трафика

**Установка:**

```bash
# Ubuntu/Debian
sudo apt install nload

# CentOS/RHEL
sudo yum install nload
```

**Использование:**

```bash
# Мониторинг всех интерфейсов
nload

# Конкретный интерфейс
nload eth0

# Обновление каждые 500ms
nload -t 500
```

### 5. bmon - Монитор пропускной способности

**Установка:**

```bash
# Ubuntu/Debian
sudo apt install bmon

# CentOS/RHEL
sudo yum install bmon
```

**Использование:**

```bash
# Интерактивный режим
bmon

# Вывод в текстовом формате
bmon -o format:fmt='$(element:name) $(attr:rxrate:bytes) $(attr:txrate:bytes)\n'
```

## Комбинированный скрипт для мониторинга

Создайте скрипт для быстрой проверки трафика:

```bash
sudo nano /usr/local/bin/check-traffic.sh
```

```bash
#!/bin/bash

echo "=========================================="
echo "  Мониторинг трафика VPS"
echo "=========================================="
echo ""

# 1. vnstat статистика
echo "📊 Статистика трафика (vnstat):"
echo "-----------------------------------"
vnstat -d | tail -5
echo ""

# 2. Текущие соединения
echo "🔌 Активные соединения (top 10 по трафику):"
echo "-----------------------------------"
ss -tunap | head -10
echo ""

# 3. Трафик по интерфейсам
echo "📡 Трафик по интерфейсам:"
echo "-----------------------------------"
if command -v ifconfig &> /dev/null; then
    ifconfig | grep -E "RX|TX" | head -10
elif command -v ip &> /dev/null; then
    ip -s link show | grep -A 1 "RX\|TX" | head -20
fi
echo ""

# 4. Docker контейнеры (если используется)
if command -v docker &> /dev/null; then
    echo "🐳 Трафик Docker контейнеров:"
    echo "-----------------------------------"
    docker stats --no-stream --format "table {{.Name}}\t{{.NetIO}}" | head -10
    echo ""
fi

# 5. Процессы с сетевым трафиком (требует nethogs)
if command -v nethogs &> /dev/null; then
    echo "⚙️  Процессы с трафиком (nethogs):"
    echo "-----------------------------------"
    timeout 3 sudo nethogs -t 2>/dev/null | head -10 || echo "Требуются права sudo"
    echo ""
fi

echo "=========================================="
```

```bash
sudo chmod +x /usr/local/bin/check-traffic.sh
```

Использование:

```bash
sudo /usr/local/bin/check-traffic.sh
```

## Автоматические алерты при высоком трафике

Создайте скрипт для проверки и отправки алертов:

```bash
sudo nano /usr/local/bin/traffic-alert.sh
```

```bash
#!/bin/bash

# Порог в байтах (например, 10 GB = 10737418240)
THRESHOLD=10737418240

# Получаем исходящий трафик за сегодня
TRAFFIC=$(vnstat -d --json | jq -r '.interfaces[0].traffic.days[0].tx')

if [ -z "$TRAFFIC" ] || [ "$TRAFFIC" = "null" ]; then
    TRAFFIC=0
fi

# Конвертируем в байты (vnstat возвращает в байтах)
TRAFFIC_BYTES=$TRAFFIC

if [ $TRAFFIC_BYTES -gt $THRESHOLD ]; then
    TRAFFIC_GB=$(echo "scale=2; $TRAFFIC_BYTES/1073741824" | bc)

    echo "⚠️  ВНИМАНИЕ: Высокий исходящий трафик!"
    echo "Трафик: ${TRAFFIC_GB} GB"
    echo "Порог: $(echo "scale=2; $THRESHOLD/1073741824" | bc) GB"

    # Отправить email (если настроен)
    # echo "Высокий трафик: ${TRAFFIC_GB} GB" | mail -s "Traffic Alert" your@email.com

    # Записать в лог
    echo "$(date): High traffic detected: ${TRAFFIC_GB} GB" >> /var/log/traffic-alerts.log

    # Показать топ процессов
    echo ""
    echo "Топ процессов по трафику:"
    timeout 5 sudo nethogs -t 2>/dev/null | head -10
fi
```

```bash
sudo chmod +x /usr/local/bin/traffic-alert.sh

# Добавить в cron для проверки каждые 5 минут
sudo crontab -e
# Добавить:
*/5 * * * * /usr/local/bin/traffic-alert.sh
```

## Интеграция с системным мониторингом

### Использование с systemd

Создайте сервис для мониторинга:

```bash
sudo nano /etc/systemd/system/traffic-monitor.service
```

```ini
[Unit]
Description=Traffic Monitor Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/traffic-alert.sh
Restart=on-failure
RestartSec=60

[Install]
WantedBy=multi-user.target
```

## Быстрая установка всех утилит

Создайте скрипт для установки:

```bash
sudo nano /usr/local/bin/install-traffic-tools.sh
```

```bash
#!/bin/bash

echo "Установка утилит для мониторинга трафика..."

# Определяем дистрибутив
if [ -f /etc/debian_version ]; then
    sudo apt update
    sudo apt install -y vnstat vnstati iftop nethogs nload bmon jq bc
elif [ -f /etc/redhat-release ]; then
    sudo yum install -y vnstat vnstati iftop nethogs nload bmon jq bc
fi

# Инициализация vnstat
INTERFACE=$(ip route | grep default | awk '{print $5}' | head -1)
if [ ! -z "$INTERFACE" ]; then
    echo "Инициализация vnstat для интерфейса: $INTERFACE"
    sudo vnstat -i $INTERFACE
    sudo systemctl enable vnstat
    sudo systemctl start vnstat
fi

echo "✅ Установка завершена!"
echo ""
echo "Использование:"
echo "  vnstat - статистика трафика"
echo "  sudo iftop -i $INTERFACE - мониторинг в реальном времени"
echo "  sudo nethogs - трафик по процессам"
```

```bash
sudo chmod +x /usr/local/bin/install-traffic-tools.sh
sudo /usr/local/bin/install-traffic-tools.sh
```

## Рекомендации

1. **Для постоянного мониторинга:** Используйте `vnstat` - он сохраняет историю и не требует постоянного запуска
2. **Для поиска проблем:** Используйте `nethogs` - показывает трафик по процессам
3. **Для реального времени:** Используйте `iftop` или `nload`
4. **Для автоматизации:** Настройте cron задачи с `vnstat` и скриптами алертов

## Примеры использования

### Найти процесс с высоким трафиком:

```bash
sudo nethogs
# Нажмите 's' для сортировки по трафику
```

### Мониторинг конкретного IP:

```bash
sudo iftop -i eth0 -f "host 8.8.8.8"
```

### Экспорт статистики:

```bash
# JSON формат
vnstat --json > traffic-stats.json

# CSV формат
vnstat --csv -d > traffic-daily.csv
```

### Сравнение трафика за периоды:

```bash
# Сегодня vs вчера
vnstat -d

# Этот месяц vs прошлый
vnstat -m
```
