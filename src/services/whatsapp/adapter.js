import { config } from '../../config/index.js';
import UnofficialWhatsAppService from './unofficial.js';
import OfficialWhatsAppService from './official.js';

class WhatsAppAdapter {
  constructor() {
    this.provider = config.provider;
    this.service = null;
    this.messageCallbacks = [];
    this.ownMessageCallbacks = []; // Для callback сообщений от себя
  }

  async initialize() {
    if (this.provider === 'official') {
      this.service = new OfficialWhatsAppService();
      // Официальный API не требует инициализации клиента
      console.log('Using official WhatsApp Business Cloud API');
    } else {
      this.service = new UnofficialWhatsAppService();
      await this.service.initialize();
      console.log('Using Baileys (unofficial WhatsApp provider)');
    }

    // Подписываемся на входящие сообщения
    this.service.onMessage((messageData) => {
      this.messageCallbacks.forEach(callback => {
        try {
          callback(messageData);
        } catch (error) {
          console.error('Error in adapter message callback:', error);
        }
      });
    });

    // Подписываемся на сообщения отправленные самим собой
    if (this.service.onOwnMessage && this.ownMessageCallbacks.length > 0) {
      this.service.onOwnMessage(this.ownMessageCallbacks);
    }
  }

  async sendMessage(phone, message, options = {}) {
    if (!this.service) {
      throw new Error('WhatsApp service is not initialized');
    }

    return await this.service.sendMessage(phone, message, options);
  }

  async sendMedia(phone, mediaPath, options = {}) {
    if (!this.service) {
      throw new Error('WhatsApp service is not initialized');
    }

    return await this.service.sendMedia(phone, mediaPath, options);
  }

  async sendTemplate(phone, templateName, languageCode = 'ru', parameters = []) {
    if (!this.service) {
      throw new Error('WhatsApp service is not initialized');
    }

    if (this.provider !== 'official') {
      throw new Error('Template messages are only supported by official WhatsApp Business API');
    }

    return await this.service.sendTemplate(phone, templateName, languageCode, parameters);
  }

  async getGroups() {
    if (!this.service) {
      throw new Error('WhatsApp service is not initialized');
    }

    return await this.service.getGroups();
  }

  async sendMessageToGroup(groupId, message) {
    if (!this.service) {
      throw new Error('WhatsApp service is not initialized');
    }

    return await this.service.sendMessageToGroup(groupId, message);
  }

  onMessage(callback) {
    this.messageCallbacks.push(callback);
  }

  onOwnMessage(callback) {
    this.ownMessageCallbacks.push(callback);
  }

  async getMessageById(messageId) {
    if (!this.service) {
      throw new Error('WhatsApp service is not initialized');
    }

    // Метод поддерживается только в unofficial провайдере
    if (this.provider === 'official') {
      throw new Error('Getting messages by ID is not supported in official API');
    }

    return await this.service.getMessageById(messageId);
  }

  getProvider() {
    return this.provider;
  }

  async getStatus() {
    if (!this.service) {
      return { initialized: false };
    }

    if (this.provider === 'official') {
      return {
        initialized: true,
        provider: 'official',
        ready: true
      };
    } else {
      const info = await this.service.getClientInfo();
      return {
        initialized: true,
        provider: 'unofficial',
        ...info
      };
    }
  }

  verifyWebhook(mode, token) {
    if (this.provider === 'official' && this.service) {
      return this.service.verifyWebhook(mode, token);
    }
    return false;
  }

  handleWebhook(webhookData) {
    if (this.provider === 'official' && this.service) {
      this.service.handleWebhook(webhookData);
    }
  }

  async disconnect() {
    if (this.service && this.provider === 'unofficial') {
      await this.service.disconnect();
    }
  }
}

// Создаем singleton экземпляр
let adapterInstance = null;

export const getWhatsAppAdapter = async () => {
  if (!adapterInstance) {
    adapterInstance = new WhatsAppAdapter();
    await adapterInstance.initialize();
  }
  return adapterInstance;
};

export default WhatsAppAdapter;
