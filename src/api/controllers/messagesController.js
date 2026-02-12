import { getWhatsAppAdapter } from '../../services/whatsapp/adapter.js';
import webhookService from '../../services/webhook.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

export const sendMessage = async (req, res, next) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        error: 'Phone number and message are required'
      });
    }

    const adapter = await getWhatsAppAdapter();
    const result = await adapter.sendMessage(phone, message);

    // Уведомляем вебхуки
    await webhookService.notifyWebhooks('message_sent', {
      phone,
      message,
      ...result
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const sendMedia = async (req, res, next) => {
  try {
    const { phone, caption } = req.body;
    const file = req.file;

    if (!phone || !file) {
      return res.status(400).json({
        error: 'Phone number and media file are required'
      });
    }

    const adapter = await getWhatsAppAdapter();
    const mediaPath = file.path;
    
    const result = await adapter.sendMedia(phone, mediaPath, {
      caption: caption || ''
    });

    // Удаляем временный файл после отправки
    fs.unlink(mediaPath, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    // Уведомляем вебхуки
    await webhookService.notifyWebhooks('media_sent', {
      phone,
      mediaType: file.mimetype,
      caption,
      ...result
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    // Удаляем файл в случае ошибки
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    next(error);
  }
};

export const sendTemplate = async (req, res, next) => {
  try {
    const { phone, templateName, languageCode = 'ru', parameters = [] } = req.body;

    if (!phone || !templateName) {
      return res.status(400).json({
        error: 'Phone number and template name are required'
      });
    }

    const adapter = await getWhatsAppAdapter();
    const result = await adapter.sendTemplate(phone, templateName, languageCode, parameters);

    // Уведомляем вебхуки
    await webhookService.notifyWebhooks('template_sent', {
      phone,
      templateName,
      languageCode,
      parameters,
      ...result
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    // В реальном приложении здесь была бы база данных
    // Для демонстрации возвращаем пустой массив
    res.json({
      success: true,
      data: [],
      message: 'Messages are received via webhooks. Use webhook endpoints to receive messages.'
    });
  } catch (error) {
    next(error);
  }
};

export const getMessageById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const adapter = await getWhatsAppAdapter();
    const message = await adapter.getMessageById(id);
    
    if (message) {
      res.json({
        success: true,
        data: message
      });
    } else {
      res.status(404).json({
        error: 'Message not found',
        message: 'Message with this ID was not found or has expired.'
      });
    }
  } catch (error) {
    next(error);
  }
};
