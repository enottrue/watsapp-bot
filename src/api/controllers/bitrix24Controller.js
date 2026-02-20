import { getBitrix24Service } from '../../services/bitrix24/index.js';

/**
 * Контроллер для работы с Битрикс24
 */
class Bitrix24Controller {
  /**
   * Получить список всех коннекторов
   */
  async getConnectors(req, res) {
    try {
      const service = getBitrix24Service();
      const connectors = await service.getConnectors();
      
      res.json({
        success: true,
        data: connectors || []
      });
    } catch (error) {
      console.error('Error getting Bitrix24 connectors:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Получить информацию о конкретном коннекторе
   */
  async getConnector(req, res) {
    try {
      const { connectorId } = req.params;
      const service = getBitrix24Service();
      const connector = await service.getConnectorById(connectorId);
      
      res.json({
        success: true,
        data: connector
      });
    } catch (error) {
      console.error('Error getting Bitrix24 connector:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Получить список открытых линий
   */
  async getOpenLines(req, res) {
    try {
      const service = getBitrix24Service();
      const openLines = await service.getOpenLines();
      
      res.json({
        success: true,
        data: openLines || []
      });
    } catch (error) {
      console.error('Error getting open lines:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Получить список приложений/интеграций
   */
  async getApps(req, res) {
    try {
      const service = getBitrix24Service();
      const apps = await service.getApps();
      
      res.json({
        success: true,
        data: apps || []
      });
    } catch (error) {
      console.error('Error getting apps:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Проверить подключение к Битрикс24
   */
  async testConnection(req, res) {
    try {
      const service = getBitrix24Service();
      const result = await service.testConnection();
      
      res.json(result);
    } catch (error) {
      console.error('Error testing connection:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Получить информацию о текущем пользователе
   */
  async getCurrentUser(req, res) {
    try {
      const service = getBitrix24Service();
      const user = await service.getCurrentUser();
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error getting current user:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new Bitrix24Controller();
