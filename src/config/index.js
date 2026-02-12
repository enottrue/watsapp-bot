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
};

export default config;
