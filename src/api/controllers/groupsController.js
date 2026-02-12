import { getWhatsAppAdapter } from '../../services/whatsapp/adapter.js';
import webhookService from '../../services/webhook.js';

export const getGroups = async (req, res, next) => {
  try {
    const adapter = await getWhatsAppAdapter();
    const groups = await adapter.getGroups();

    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessageToGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    const adapter = await getWhatsAppAdapter();
    const result = await adapter.sendMessageToGroup(id, message);

    // Уведомляем вебхуки
    await webhookService.notifyWebhooks('group_message_sent', {
      groupId: id,
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
