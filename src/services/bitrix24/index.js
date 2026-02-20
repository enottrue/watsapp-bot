import dotenv from 'dotenv';

dotenv.config();

export const config = {
  bitrix24: {
    domain: process.env.B24_DOMAIN || '',
    accessToken: process.env.B24_ACCESS_TOKEN || '',
    clientId: process.env.B24_CLIENT_ID || '',
    clientSecret: process.env.B24_CLIENT_SECRET || '',
  },
};

class Bitrix24Service {
  constructor() {
    this.domain = config.bitrix24.domain;
    this.accessToken = config.bitrix24.accessToken;
    this.clientId = config.bitrix24.clientId;
    this.clientSecret = config.bitrix24.clientSecret;
  }

  /**
   * Получить URL для API
   */
  getApiUrl(method) {
    // Проверяем что токен не пустой
    if (this.accessToken && this.accessToken.trim()) {
      return `https://${this.domain}/rest/1/${this.accessToken}/${method}`;
    }
    // Для локальных приложений
    if (this.clientId && this.clientSecret) {
      return `https://${this.domain}/rest/${this.clientId}/${this.clientSecret}/${method}`;
    }
    throw new Error('Не настроены credentials для Битрикс24');
  }

  /**
   * Выполнить запрос к API
   */
  async callMethod(method, params = {}) {
    const url = this.getApiUrl(method);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      return data.result;
    } catch (error) {
      console.error(`Bitrix24 API error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получить список коннекторов
   */
  async getConnectors() {
    return await this.callMethod('imconnector.list', { CONNECTOR: 'all' });
  }

  /**
   * Получить открытые линии
   */
  async getOpenLines() {
    return await this.callMethod('im.openlines.get');
  }

  /**
   * Текущий пользователь
   */
  async getCurrentUser() {
    return await this.callMethod('user.current');
  }

  /**
   * Проверка подключения
   */
  async testConnection() {
    try {
      if (!this.domain) {
        return { success: false, error: 'B24_DOMAIN не настроен' };
      }
      
      const user = await this.getCurrentUser();
      return { 
        success: true, 
        user: user.name || user.ID,
        domain: this.domain 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

let serviceInstance = null;

export const getBitrix24Service = () => {
  if (!serviceInstance) {
    serviceInstance = new Bitrix24Service();
  }
  return serviceInstance;
};

export default Bitrix24Service;
