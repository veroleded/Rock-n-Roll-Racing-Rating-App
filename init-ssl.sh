#!/bin/bash

# Создаем необходимые директории
mkdir -p certbot/conf
mkdir -p certbot/www

# Останавливаем контейнеры если они запущены
docker-compose -f docker-compose.prod.yml down

# Получаем SSL сертификат
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email timur1776@gmail.com \
    --agree-tos \
    --no-eff-email \
    -d vm3064320.firstbyte.club

# Запускаем контейнеры
docker-compose -f docker-compose.prod.yml up -d 