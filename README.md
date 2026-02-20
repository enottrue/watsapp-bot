# WhatsApp API Решение

REST API для отправки и приема сообщений WhatsApp с поддержкой двух провайдеров:
- **Официальный**: WhatsApp Business Cloud API (Meta)
- **Неофициальный**: Baileys (работает напрямую с протоколом WhatsApp, без браузера)

## Возможности

- ✅ Отправка текстовых сообщений
- ✅ Отправка медиа файлов (изображения, видео, документы, аудио)
- ✅ Отправка шаблонных сообщений (только для официального API)
- ✅ Получение входящих сообщений через вебхуки
- ✅ Работа с группами
- ✅ Регистрация внешних вебхуков для уведомлений
- ✅ Единый REST API интерфейс для обоих провайдеров

## Установка

### Требования

- Node.js 18+ 
- npm или yarn

### Шаги установки

1. Клонируйте репозиторий или скачайте файлы проекта

2. Установите зависимости:

```bash
npm install
```

3. Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

4. Настройте переменные окружения в `.env` файле (см. раздел Конфигурация)

5. Запустите сервер:

```bash
npm start
```

Для разработки с автоперезагрузкой:

```bash
npm run dev
```

## Конфигурация

### Неофициальный провайдер (Baileys)

Для использования неофициального провайдера установите в `.env`:

```env
WHATSAPP_PROVIDER=unofficial
WHATSAPP_SESSION_PATH=./sessions
```

При первом запуске появится QR-код в консоли. Отсканируйте его с помощью WhatsApp на вашем телефоне для авторизации. Сессия будет сохранена в папке `sessions`.

**Запуск на сервере (без доступа к консоли):**

- **Страница с QR в браузере:** откройте `https://ваш-сервер:PORT/api/qr` — отобразится QR, который можно отсканировать с телефона.
- **Только картинка:** `GET /api/qr?format=image` — ответ в виде PNG.
- **Отправка в Telegram:** задайте в `.env` переменные `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` (бот пришлёт вам QR в личку при появлении). Создайте бота через [@BotFather](https://t.me/BotFather), ваш Chat ID можно узнать у [@userinfobot](https://t.me/userinfobot).

**Преимущества Baileys:**
- ✅ Работает без браузера (меньше потребление ресурсов)
- ✅ Более стабильное подключение
- ✅ Работает напрямую с протоколом WhatsApp
- ✅ Быстрее и эффективнее чем WhatsApp Web

### Официальный провайдер (WhatsApp Business Cloud API)

Для использования официального API установите в `.env`:

```env
WHATSAPP_PROVIDER=official
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_WEBHOOK_URL=https://your-domain.com/api/webhooks/incoming
```

**Как получить токены:**

1. Создайте приложение в [Meta for Developers](https://developers.facebook.com/)
2. Добавьте продукт "WhatsApp"
3. Получите Access Token и Phone Number ID
4. Настройте вебхук в настройках приложения

## API Документация

### Базовый URL

```
http://localhost:3000/api
```

### Endpoints

#### Отправка сообщений

**Отправить текстовое сообщение**

```http
POST /api/messages/send
Content-Type: application/json

{
  "phone": "+79001234567",
  "message": "Привет! Это тестовое сообщение"
}
```

**Отправить медиа файл**

```http
POST /api/messages/send-media
Content-Type: multipart/form-data

phone: +79001234567
media: [файл]
caption: Описание изображения (опционально)
```

**Отправить шаблонное сообщение** (только для официального API)

```http
POST /api/messages/send-template
Content-Type: application/json

{
  "phone": "+79001234567",
  "templateName": "hello_world",
  "languageCode": "ru",
  "parameters": ["параметр1", "параметр2"]
}
```

#### Получение сообщений

**Список сообщений**

```http
GET /api/messages
```

**Получить сообщение по ID**

```http
GET /api/messages/:id
```

#### Группы

**Получить список групп**

```http
GET /api/groups
```

**Отправить сообщение в группу**

```http
POST /api/groups/:id/messages
Content-Type: application/json

{
  "message": "Сообщение для группы"
}
```

#### Вебхуки

**Верификация вебхука** (для официального API)

```http
GET /api/webhooks/verify?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE
```

**Обработка входящих сообщений**

```http
POST /api/webhooks/incoming
```

**Зарегистрировать внешний вебхук**

```http
POST /api/webhooks/register
Content-Type: application/json

{
  "url": "https://your-server.com/webhook",
  "events": ["message", "status"]
}
```

**Список зарегистрированных вебхуков**

```http
GET /api/webhooks/list
```

**Отменить регистрацию вебхука**

```http
DELETE /api/webhooks/:id
```

#### Статус

**Проверить статус сервиса**

```http
GET /api/status
```

**Health check**

```http
GET /health
```

## Примеры использования

### cURL

**Отправить сообщение:**

```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+79001234567",
    "message": "Привет из API!"
  }'
```

**Отправить изображение:**

```bash
curl -X POST http://localhost:3000/api/messages/send-media \
  -F "phone=+79001234567" \
  -F "media=@/path/to/image.jpg" \
  -F "caption=Описание изображения"
```

**Получить список групп:**

```bash
curl http://localhost:3000/api/groups
```

### JavaScript (fetch)

```javascript
// Отправить сообщение
const response = await fetch('http://localhost:3000/api/messages/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    phone: '+79001234567',
    message: 'Привет из JavaScript!'
  })
});

const data = await response.json();
console.log(data);
```

### Python (requests)

```python
import requests

# Отправить сообщение
response = requests.post(
    'http://localhost:3000/api/messages/send',
    json={
        'phone': '+79001234567',
        'message': 'Привет из Python!'
    }
)

print(response.json())

# Отправить изображение
files = {'media': open('image.jpg', 'rb')}
data = {
    'phone': '+79001234567',
    'caption': 'Описание'
}
response = requests.post(
    'http://localhost:3000/api/messages/send-media',
    files=files,
    data=data
)
print(response.json())
```

## Получение входящих сообщений

### Через вебхуки (рекомендуется)

1. Зарегистрируйте вебхук:

```bash
curl -X POST http://localhost:3000/api/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook-handler",
    "events": ["message"]
  }'
```

2. Ваш сервер будет получать POST запросы при входящих сообщениях:

```json
{
  "event": "message",
  "timestamp": 1234567890,
  "data": {
    "id": "message_id",
    "from": "79001234567@c.us",
    "body": "Текст сообщения",
    "timestamp": 1234567890,
    "contact": {
      "name": "Имя контакта",
      "number": "79001234567"
    }
  }
}
```

### Через прямое подключение к сервису

Входящие сообщения автоматически обрабатываются и логируются в консоль. Вы можете расширить функциональность, добавив обработку в `src/server.js`.

## Структура проекта

```
watsapp/
├── src/
│   ├── api/
│   │   ├── routes/          # Маршруты API
│   │   └── controllers/     # Контроллеры
│   ├── services/
│   │   ├── whatsapp/        # Сервисы провайдеров
│   │   └── webhook.js       # Сервис вебхуков
│   ├── config/              # Конфигурация
│   └── server.js            # Главный файл сервера
├── sessions/                # Сессии WhatsApp (для неофициального API)
├── uploads/                 # Временные файлы загрузок
├── .env                     # Переменные окружения
├── .env.example            # Пример конфигурации
└── package.json
```

## Важные замечания

### Неофициальный провайдер (Baileys)

- ⚠️ Использование неофициального API может нарушать условия использования WhatsApp
- ⚠️ Возможны блокировки аккаунта при нарушении правил
- ✅ Быстрый старт без регистрации в Meta
- ✅ Подходит для тестирования и разработки
- ✅ Работает без браузера (меньше ресурсов)
- ✅ Более стабильное подключение чем WhatsApp Web

### Официальный провайдер (Cloud API)

- ✅ Легальный и стабильный способ
- ✅ Поддержка шаблонов сообщений
- ✅ Соответствие политике WhatsApp
- ⚠️ Требует бизнес-аккаунт и регистрацию в Meta
- ⚠️ Может требовать одобрения шаблонов сообщений

## Формат номеров телефонов

Номера телефонов должны быть в международном формате:
- ✅ `+79001234567`
- ✅ `79001234567` (автоматически добавится +7)
- ✅ `89001234567` (автоматически конвертируется в +7)

## Обработка ошибок

Все ошибки возвращаются в формате:

```json
{
  "error": {
    "message": "Описание ошибки"
  }
}
```

Примеры ошибок:
- `400` - Неверные параметры запроса
- `404` - Ресурс не найден
- `500` - Внутренняя ошибка сервера

## Разработка

### Добавление нового провайдера

1. Создайте новый класс в `src/services/whatsapp/`
2. Реализуйте методы: `sendMessage`, `sendMedia`, `getGroups`, `onMessage`
3. Добавьте провайдер в `adapter.js`

### Расширение функциональности

- Добавьте новые endpoints в `src/api/routes/`
- Создайте контроллеры в `src/api/controllers/`
- Расширьте сервисы в `src/services/`

## Лицензия

MIT

## Поддержка

При возникновении проблем:
1. Проверьте логи в консоли
2. Убедитесь, что все переменные окружения настроены правильно
3. Для неофициального API (Baileys): убедитесь, что QR-код отсканирован
4. Для официального API: проверьте токены и настройки вебхука
5. Если возникают проблемы с подключением Baileys, попробуйте удалить папку `sessions` и пересканировать QR-код