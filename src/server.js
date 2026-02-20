import express from 'express';
import { config } from './config/index.js';
import { getWhatsAppAdapter } from './services/whatsapp/adapter.js';
import webhookService from './services/webhook.js';
import { sendQrToTelegram } from './services/telegram.js';
import messagesRoutes from './api/routes/messages.js';
import webhooksRoutes from './api/routes/webhooks.js';
import groupsRoutes from './api/routes/groups.js';
import bitrix24Routes from './api/routes/bitrix24.js';
import oauthRoutes from './api/routes/oauth.js';

const app = express();

// Инициализация WhatsApp адаптера
let adapter = null;

async function initializeWhatsApp() {
  try {
    console.log('Initializing WhatsApp adapter...');
    adapter = await getWhatsAppAdapter({
      onQr: (qr, dataUrl) => {
        sendQrToTelegram(dataUrl, 'Отсканируйте QR для авторизации WhatsApp (сервер)');
      },
    });

    // Подписываемся на входящие сообщения
    adapter.onMessage(async (messageData) => {
      console.log('Incoming message:', messageData.from, messageData.body);

      // Уведомляем зарегистрированные вебхуки
      await webhookService.notifyWebhooks('message', messageData);

      // Отправляем сообщение напрямую в интеграцию bmad (вариант A)
      if (config.bmadInternalUrl) {
        try {
          const axios = (await import('axios')).default;
          // Форматируем телефон: удаляем @s.whatsapp.net если есть
          const phone = messageData.from.replace('@s.whatsapp.net', '');
          // Извлекаем имя, если есть
          const name = messageData.pushName || 'WhatsApp User';

          await axios.post(`${config.bmadInternalUrl}/internal/whatsapp/incoming`, {
            phone: phone,
            message: messageData.body,
            name: name,
            messageId: messageData.id?.id || messageData.id
          }, {
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Secret': config.bmadInternalSecret || ''
            },
            timeout: 10000
          });
          console.log(`Successfully forwarded message from ${phone} to bmad`);
        } catch (error) {
          console.error('Failed to forward message to bmad:', error.message);
        }
      }
    });

    console.log('WhatsApp adapter initialized successfully');
  } catch (error) {
    console.error('Failed to initialize WhatsApp adapter:', error);
    // Не останавливаем сервер, но логируем ошибку
  }
}

// Инициализируем при старте
initializeWhatsApp();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/messages', messagesRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/bitrix24', bitrix24Routes);
app.use('/oauth', oauthRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    provider: config.provider,
    timestamp: new Date().toISOString()
  });
});

// Status endpoint
app.get('/api/status', async (req, res) => {
  try {
    if (!adapter) {
      return res.json({
        status: 'initializing',
        provider: config.provider
      });
    }

    const status = await adapter.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// QR для авторизации WhatsApp (только unofficial/Baileys, при запуске на сервере)
app.get('/api/qr', async (req, res) => {
  try {
    if (!adapter) {
      return res.status(503).json({ error: 'Service initializing', message: 'Retry in a few seconds' });
    }
    if (config.provider !== 'unofficial') {
      return res.status(404).json({ error: 'QR only for unofficial provider' });
    }
    const status = await adapter.getStatus();
    if (status.ready) {
      return res.json({ message: 'Already connected', ready: true });
    }
    const qrData = adapter.getCurrentQr();
    if (!qrData || !qrData.dataUrl) {
      return res.status(202).json({
        message: 'QR not ready yet. Wait and refresh the page or retry GET /api/qr',
        ready: false
      });
    }
    const format = req.query.format;
    if (format === 'json') {
      return res.json({ dataUrl: qrData.dataUrl, ready: false });
    }
    if (format === 'image') {
      const buffer = Buffer.from(qrData.dataUrl.split(',')[1], 'base64');
      res.type('png').send(buffer);
      return;
    }
    // По умолчанию: HTML-страница с QR, удобно открыть в браузере на сервере
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>WhatsApp QR</title></head>
<body style="font-family:sans-serif;text-align:center;padding:2rem;">
  <h1>Отсканируйте QR в WhatsApp</h1>
  <p>Откройте WhatsApp на телефоне → Настройки → Связанные устройства → Привязать устройство</p>
  <img src="${qrData.dataUrl}" alt="QR" style="max-width:320px;height:auto;" />
  <p><small>Страница обновляется при новом QR. Если уже подключено — <a href="/api/status">/api/status</a></small></p>
</body>
</html>`;
    res.type('html').send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(config.nodeEnv === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Provider: ${config.provider}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Status: http://localhost:${PORT}/api/status`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  if (adapter) {
    await adapter.disconnect();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  if (adapter) {
    await adapter.disconnect();
  }
  process.exit(0);
});

export default app;
