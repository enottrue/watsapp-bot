import express from 'express';
import {
  sendMessage,
  sendMedia,
  sendTemplate,
  getMessages,
  getMessageById,
  upload
} from '../controllers/messagesController.js';

const router = express.Router();

// Отправка текстового сообщения
router.post('/send', sendMessage);

// Отправка медиа файла
router.post('/send-media', upload.single('media'), sendMedia);

// Отправка шаблонного сообщения (только для официального API)
router.post('/send-template', sendTemplate);

// Получение списка сообщений
router.get('/', getMessages);

// Получение конкретного сообщения
router.get('/:id', getMessageById);

export default router;
