import dotenv from 'dotenv';

dotenv.config();

export const config = {
  provider: process.env.WHATSAPP_PROVIDER || 'unofficial',
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Официальный API настройки
  official: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    webhookUrl: process.env.WHATSAPP_WEBHOOK_URL || '',
  },

  // Неофициальный API настройки
  unofficial: {
    sessionPath: process.env.WHATSAPP_SESSION_PATH || './sessions',
  },

  // Общие настройки
  webhookSecret: process.env.WEBHOOK_SECRET || '',

  // Битрикс24 настройки
  bitrix24: {
    domain: process.env.B24_DOMAIN || '',
    accessToken: process.env.B24_ACCESS_TOKEN || '',
    webhookSecret: process.env.B24_WEBHOOK_SECRET || '',
  },

  // Telegram (опционально: отправка QR для авторизации WhatsApp на сервере)
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },

  // Интеграция с Bmad-Telegram-Bitrix
  bmadInternalUrl: process.env.BMAD_INTERNAL_URL || '',
  bmadInternalSecret: process.env.BMAD_INTERNAL_SECRET || '',
};

export default config;
