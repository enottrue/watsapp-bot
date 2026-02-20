import express from 'express';
import bitrix24Controller from '../controllers/bitrix24Controller.js';

const router = express.Router();

// Проверка подключения
router.get('/test', bitrix24Controller.testConnection);

// Текущий пользователь
router.get('/user', bitrix24Controller.getCurrentUser);

// Коннекторы
router.get('/connectors', bitrix24Controller.getConnectors);
router.get('/connectors/:connectorId', bitrix24Controller.getConnector);

// Открытые линии
router.get('/openlines', bitrix24Controller.getOpenLines);

// Приложения/интеграции
router.get('/apps', bitrix24Controller.getApps);

export default router;
