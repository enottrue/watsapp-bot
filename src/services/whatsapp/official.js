import axios from 'axios';
import { config } from '../../config/index.js';

class OfficialWhatsAppService {
  constructor() {
    this.accessToken = config.official.accessToken;
    this.phoneNumberId = config.official.phoneNumberId;
    this.verifyToken = config.official.verifyToken;
    this.webhookUrl = config.official.webhookUrl;
    this.apiVersion = 'v18.0';
    this.baseURL = `https://graph.facebook.com/${this.apiVersion}`;
    
    this.webhookCallbacks = [];
  }

  async sendMessage(phone, message, options = {}) {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('WhatsApp Business API credentials are not configured');
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message
        }
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error sending message via official API:', error.response?.data || error.message);
      throw new Error(`Failed to send message: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async sendTemplate(phone, templateName, languageCode = 'ru', parameters = []) {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('WhatsApp Business API credentials are not configured');
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          },
          components: parameters.length > 0 ? [{
            type: 'body',
            parameters: parameters.map(param => ({
              type: 'text',
              text: param
            }))
          }] : []
        }
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error sending template via official API:', error.response?.data || error.message);
      throw new Error(`Failed to send template: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async sendMedia(phone, mediaUrl, mediaType = 'image', caption = '') {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('WhatsApp Business API credentials are not configured');
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      // Сначала загружаем медиа
      const mediaId = await this.uploadMedia(mediaUrl, mediaType);
      
      const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: mediaType,
        [mediaType]: {
          id: mediaId,
          ...(caption && { caption })
        }
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error sending media via official API:', error.response?.data || error.message);
      throw new Error(`Failed to send media: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async uploadMedia(mediaUrl, mediaType) {
    try {
      // Для официального API нужно сначала загрузить медиа
      // Здесь упрощенная версия - в реальности нужно использовать Media API
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/media`,
        {
          messaging_product: 'whatsapp',
          type: mediaType,
          url: mediaUrl
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.id;
    } catch (error) {
      console.error('Error uploading media:', error.response?.data || error.message);
      throw new Error(`Failed to upload media: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  verifyWebhook(mode, token) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return true;
    }
    return false;
  }

  handleWebhook(webhookData) {
    try {
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) {
        return;
      }

      // Обработка входящих сообщений
      if (value.messages) {
        value.messages.forEach(message => {
          const messageData = this.formatIncomingMessage(message, value.contacts?.[0]);
          this.webhookCallbacks.forEach(callback => {
            try {
              callback(messageData);
            } catch (error) {
              console.error('Error in webhook callback:', error);
            }
          });
        });
      }

      // Обработка статусов сообщений
      if (value.statuses) {
        value.statuses.forEach(status => {
          console.log('Message status update:', status);
        });
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
    }
  }

  formatIncomingMessage(message, contact) {
    return {
      id: message.id,
      from: message.from,
      timestamp: parseInt(message.timestamp) * 1000,
      type: message.type,
      body: message.text?.body || '',
      media: message.image || message.video || message.audio || message.document || null,
      contact: contact ? {
        name: contact.profile?.name || 'Unknown',
        number: message.from
      } : null,
      raw: message
    };
  }

  onMessage(callback) {
    this.webhookCallbacks.push(callback);
  }

  formatPhoneNumber(phone) {
    // Убираем все нецифровые символы кроме +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Если номер не начинается с +, добавляем код страны по умолчанию
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('7') || cleaned.startsWith('8')) {
        cleaned = '+7' + cleaned.replace(/^[78]/, '');
      } else {
        cleaned = '+' + cleaned;
      }
    }
    
    return cleaned;
  }

  async getGroups() {
    // Официальный API не предоставляет прямой способ получить список групп
    // Группы обычно управляются через другие механизмы
    throw new Error('Getting groups list is not directly supported by WhatsApp Business Cloud API');
  }

  async sendMessageToGroup(groupId, message) {
    // В официальном API группы идентифицируются по-другому
    // Обычно используется номер телефона группы
    return this.sendMessage(groupId, message);
  }
}

export default OfficialWhatsAppService;
