import express from 'express';
import { config } from './config/index.js';
import { getWhatsAppAdapter } from './services/whatsapp/adapter.js';
import webhookService from './services/webhook.js';
import messagesRoutes from './api/routes/messages.js';
import webhooksRoutes from './api/routes/webhooks.js';
import groupsRoutes from './api/routes/groups.js';

const app = express();

// Инициализация WhatsApp адаптера
let adapter = null;

async function initializeWhatsApp() {
  try {
    console.log('Initializing WhatsApp adapter...');
    adapter = await getWhatsAppAdapter();
    
    // Подписываемся на входящие сообщения
    adapter.onMessage(async (messageData) => {
      console.log('Incoming message:', messageData.from, messageData.body);
      
      // Уведомляем зарегистрированные вебхуки
      await webhookService.notifyWebhooks('message', messageData);
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
