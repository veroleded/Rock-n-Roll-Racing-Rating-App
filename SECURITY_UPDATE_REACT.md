# ⚠️ КРИТИЧЕСКОЕ ОБНОВЛЕНИЕ БЕЗОПАСНОСТИ

## 🚨 CVE-2025-55182 - Критическая уязвимость (CVSS 10.0)

**Дата обнаружения:** 3 декабря 2025  
**Источник:** [React Security Advisory](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)

### Описание уязвимости

Критическая уязвимость в React Server Components, позволяющая **неаутентифицированное удаленное выполнение кода (RCE)** через специально сформированные HTTP-запросы к Server Function endpoints.

**Затронутые версии:**

- `react-server-dom-webpack`: 19.0.0, 19.1.0, 19.1.1, 19.2.0
- `react-server-dom-parcel`: 19.0.0, 19.1.0, 19.1.1, 19.2.0
- `react-server-dom-turbopack`: 19.0.0, 19.1.0, 19.1.1, 19.2.0

**Исправленные версии:**

- `react-server-dom-webpack`: 19.0.1, 19.1.2, **19.2.1**
- `react-server-dom-parcel`: 19.0.1, 19.1.2, **19.2.1**
- `react-server-dom-turbopack`: 19.0.1, 19.1.2, **19.2.1**

### Дополнительные уязвимости

- **CVE-2025-55184** - Denial of Service (CVSS 7.5)
- **CVE-2025-55183** - Source Code Exposure (CVSS 5.3)
- **CVE-2025-67779** - Дополнительная уязвимость

## ✅ Что было сделано

### Обновлены пакеты:

```json
{
  "react": "19.2.1",
  "react-dom": "19.2.1",
  "react-server-dom-webpack": "19.2.1",
  "next": "15.5.9"
}
```

### Команды для обновления:

```bash
# Обновить React и связанные пакеты
npm install react@19.2.1 react-dom@19.2.1 react-server-dom-webpack@19.2.1 --save-exact --legacy-peer-deps

# Проверить установленные версии
npm list react react-dom react-server-dom-webpack

# Проверить уязвимости
npm audit
```

## 🔍 Проверка на сервере

### 1. Обновить зависимости:

```bash
cd /root/Rock-n-Roll-Racing-Rating-App
git pull
npm install --legacy-peer-deps
```

### 2. Пересобрать и перезапустить:

```bash
# Остановить контейнеры
docker-compose -f docker-compose.prod.bogdan.yml down

# Пересобрать с новыми зависимостями
docker-compose -f docker-compose.prod.bogdan.yml build --no-cache

# Запустить
docker-compose -f docker-compose.prod.bogdan.yml up -d

# Проверить логи
docker-compose -f docker-compose.prod.bogdan.yml logs -f app
```

### 3. Проверить версии в контейнере:

```bash
docker exec rnr_racing_app_bogdan npm list react react-dom react-server-dom-webpack
```

## ⚠️ Важно

1. **Немедленно обновите** - уязвимость активно эксплуатируется
2. **Проверьте логи** на предмет подозрительной активности
3. **Ограничьте доступ** к Server Function endpoints
4. **Мониторьте трафик** - возможны попытки эксплуатации

## 📚 Дополнительная информация

- [React Security Advisory](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)
- [Next.js Security Updates](https://nextjs.org/blog)
- [CVE-2025-55182 Details](https://www.cve.org/CVERecord?id=CVE-2025-55182)
- [CVE-2025-55182 (MITRE)](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-55182)

## 🔄 История обновлений

- **2025-12-28**: Обновлены React, React-DOM, react-server-dom-webpack до версии 19.2.1
- **2025-12-28**: Next.js уже на версии 15.5.9 (последняя патченая для 15.5.x)
