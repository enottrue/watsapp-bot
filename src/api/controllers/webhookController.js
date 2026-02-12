import { getWhatsAppAdapter } from '../../services/whatsapp/adapter.js';
import { config } from '../../config/index.js';
import webhookService from '../../services/webhook.js';

export const verifyWebhook = async (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (config.provider === 'official') {
      const adapter = await getWhatsAppAdapter();
      const isValid = adapter.verifyWebhook(mode, token);

      if (isValid) {
        console.log('Webhook verified');
        return res.status(200).send(challenge);
      } else {
        console.log('Webhook verification failed');
        return res.status(403).json({ error: 'Verification failed' });
      }
    } else {
      // Для неофициального API верификация не требуется
      return res.status(200).send(challenge || 'ok');
    }
  } catch (error) {
    console.error('Error verifying webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const handleIncomingWebhook = async (req, res) => {
  try {
    const adapter = await getWhatsAppAdapter();

    if (config.provider === 'official') {
      // Обработка вебхука от официального API
      adapter.handleWebhook(req.body);
    } else {
      // Для неофициального API сообщения обрабатываются через события клиента
      // Этот endpoint может использоваться для внешних интеграций
      console.log('Incoming webhook data:', req.body);
    }

    // Отправляем ответ сразу (WhatsApp требует быстрого ответа)
    res.status(200).json({ status: 'ok' });

    // Уведомляем зарегистрированные вебхуки
    await webhookService.notifyWebhooks('incoming_message', req.body);
  } catch (error) {
    console.error('Error handling incoming webhook:', error);
    // Все равно отвечаем 200, чтобы WhatsApp не повторял запрос
    res.status(200).json({ status: 'error', error: error.message });
  }
};

export const registerWebhook = async (req, res, next) => {
  try {
    const { url, events } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Webhook URL is required'
      });
    }

    const webhook = webhookService.register(
      url,
      events || ['message', 'status']
    );

    res.json({
      success: true,
      data: webhook
    });
  } catch (error) {
    next(error);
  }
};

export const unregisterWebhook = async (req, res, next) => {
  try {
    const { id } = req.params;

    const webhook = webhookService.unregister(id);

    if (webhook) {
      res.json({
        success: true,
        message: 'Webhook unregistered',
        data: webhook
      });
    } else {
      res.status(404).json({
        error: 'Webhook not found'
      });
    }
  } catch (error) {
    next(error);
  }
};

export const listWebhooks = async (req, res, next) => {
  try {
    const webhooks = webhookService.getRegisteredWebhooks();

    res.json({
      success: true,
      data: webhooks
    });
  } catch (error) {
    next(error);
  }
};
