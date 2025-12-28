#!/bin/bash

# Скрипт для мониторинга трафика в реальном времени
# Использование: ./monitor-traffic-realtime.sh [интерфейс]
# Пример: ./monitor-traffic-realtime.sh eth0

INTERFACE=${1:-eth0}

echo "=========================================="
echo "Мониторинг трафика в реальном времени"
echo "Интерфейс: $INTERFACE"
echo "Для остановки нажмите Ctrl+C"
echo "=========================================="
echo ""

# Проверка наличия инструментов
if ! command -v iftop &> /dev/null; then
    echo "Установка iftop..."
    sudo apt update && sudo apt install -y iftop
fi

if ! command -v nethogs &> /dev/null; then
    echo "Установка nethogs..."
    sudo apt update && sudo apt install -y nethogs
fi

echo "Выберите режим мониторинга:"
echo "1. iftop - детальный анализ по соединениям"
echo "2. nethogs - трафик по процессам"
echo "3. Общая статистика интерфейса"
echo "4. Docker stats - ресурсы контейнеров"
read -p "Выберите (1-4): " choice

case $choice in
    1)
        echo "Запуск iftop..."
        sudo iftop -i $INTERFACE -t -s 10
        ;;
    2)
        echo "Запуск nethogs..."
        sudo nethogs $INTERFACE
        ;;
    3)
        echo "Общая статистика (обновление каждые 5 секунд):"
        watch -n 5 "cat /proc/net/dev | grep $INTERFACE"
        ;;
    4)
        echo "Статистика Docker контейнеров (обновление каждые 2 секунды):"
        watch -n 2 "docker stats --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}' \$(docker ps -q --filter 'name=rnr_racing')"
        ;;
    *)
        echo "Неверный выбор"
        exit 1
        ;;
esac

