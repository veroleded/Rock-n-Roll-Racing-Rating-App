# Отключение системного nginx

## Проблема

На сервере запущен системный nginx (не в Docker), который занимает порты 80 и 443, мешая работе Docker контейнера.

## Решение

### Автоматическое отключение (рекомендуется)

```bash
cd /root/Rock-n-Roll-Racing-Rating-App
sudo ./scripts/security/disable-system-nginx.sh
```

### Ручное отключение

```bash
# 1. Остановить системный nginx
sudo systemctl stop nginx

# 2. Отключить автозапуск
sudo systemctl disable nginx

# 3. Если процессы все еще работают, завершить их
sudo ./scripts/security/kill-nginx-processes.sh

# Или вручную:
sudo pkill nginx
# Если не помогло:
sudo killall -9 nginx

# 4. Проверить статус
sudo systemctl status nginx
```

## Проверка портов

После отключения системного nginx проверьте, что порты свободны или заняты Docker контейнером:

```bash
# Проверка портов
sudo ss -tuln | grep -E ':(80|443) '

# Или через netstat
sudo netstat -tuln | grep -E ':(80|443) '

# Проверка Docker контейнера
docker ps | grep nginx
docker port rnr_racing_nginx_bogdan
```

## Полное удаление системного nginx (опционально)

Если системный nginx больше не нужен, можно удалить его:

```bash
# Остановить и отключить
sudo systemctl stop nginx
sudo systemctl disable nginx

# Удалить пакеты
sudo apt remove --purge nginx nginx-common nginx-core

# Очистить конфигурацию (опционально)
sudo rm -rf /etc/nginx
sudo rm -rf /var/log/nginx
```

## Устранение проблем

### Порт все еще занят

Если после отключения nginx порт все еще занят:

```bash
# Найти процесс, использующий порт
sudo lsof -i :80
sudo lsof -i :443

# Или через ss
sudo ss -tulpn | grep -E ':(80|443) '
```

### Конфликт с другими сервисами

Если порты заняты другим сервисом (например, Apache):

```bash
# Остановить Apache
sudo systemctl stop apache2
sudo systemctl disable apache2

# Или удалить
sudo apt remove --purge apache2
```

### Docker контейнер не может запуститься

Если Docker контейнер не может запуститься из-за занятых портов:

```bash
# 1. Убедитесь, что системный nginx остановлен
sudo systemctl stop nginx

# 2. Проверьте порты
sudo ss -tuln | grep -E ':(80|443) '

# 3. Перезапустите Docker контейнер
docker-compose -f docker-compose.prod.bogdan.yml restart nginx

# 4. Проверьте логи
docker-compose -f docker-compose.prod.bogdan.yml logs nginx
```

## Проверка после отключения

```bash
# 1. Системный nginx должен быть остановлен
sudo systemctl status nginx
# Должно показать: inactive (dead)

# 2. Docker nginx должен быть запущен
docker ps | grep nginx
# Должен показать контейнер rnr_racing_nginx_bogdan

# 3. Порты должны быть заняты Docker контейнером
sudo ss -tulpn | grep -E ':(80|443) '
# Должно показать процесс docker-proxy

# 4. Проверка доступности сайта
curl -I http://localhost
curl -I https://localhost
```

## Важно

- **Не удаляйте** системный nginx, если он используется для других целей
- **Сохраните конфигурацию** перед удалением, если она может понадобиться
- **Убедитесь**, что Docker nginx контейнер запущен перед отключением системного

