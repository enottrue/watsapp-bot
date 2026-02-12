import express from 'express';
import {
  verifyWebhook,
  handleIncomingWebhook,
  registerWebhook,
  unregisterWebhook,
  listWebhooks
} from '../controllers/webhookController.js';

const router = express.Router();

// Верификация вебхука (для официального API)
router.get('/verify', verifyWebhook);

// Обработка входящих сообщений от WhatsApp
router.post('/incoming', handleIncomingWebhook);

// Регистрация внешнего вебхука
router.post('/register', registerWebhook);

// Отмена регистрации вебхука
router.delete('/:id', unregisterWebhook);

// Список зарегистрированных вебхуков
router.get('/list', listWebhooks);

export default router;
