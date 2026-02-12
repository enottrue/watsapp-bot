import express from 'express';
import {
  getGroups,
  sendMessageToGroup
} from '../controllers/groupsController.js';

const router = express.Router();

// Получение списка групп
router.get('/', getGroups);

// Отправка сообщения в группу
router.post('/:id/messages', sendMessageToGroup);

export default router;
