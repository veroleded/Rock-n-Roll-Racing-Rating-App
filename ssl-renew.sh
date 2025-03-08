#!/bin/sh

COMPOSE="/usr/local/bin/docker-compose"
DOCKER="/usr/bin/docker"

cd /root/discord-bot-new
$COMPOSE run certbot renew
$COMPOSE exec nginx nginx -s reload 