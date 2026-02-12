import axios from 'axios';

class WebhookService {
  constructor() {
    this.registeredWebhooks = [];
  }

  register(url, events = ['message', 'status']) {
    const webhook = {
      url,
      events,
      id: Date.now().toString()
    };
    
    this.registeredWebhooks.push(webhook);
    console.log(`Webhook registered: ${url} for events: ${events.join(', ')}`);
    
    return webhook;
  }

  unregister(webhookId) {
    const index = this.registeredWebhooks.findIndex(w => w.id === webhookId);
    if (index !== -1) {
      const webhook = this.registeredWebhooks.splice(index, 1)[0];
      console.log(`Webhook unregistered: ${webhook.url}`);
      return webhook;
    }
    return null;
  }

  async notifyWebhooks(eventType, data) {
    const relevantWebhooks = this.registeredWebhooks.filter(
      webhook => webhook.events.includes(eventType) || webhook.events.includes('*')
    );

    const promises = relevantWebhooks.map(async (webhook) => {
      try {
        await axios.post(webhook.url, {
          event: eventType,
          timestamp: Date.now(),
          data
        }, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log(`Webhook notified: ${webhook.url} - ${eventType}`);
      } catch (error) {
        console.error(`Failed to notify webhook ${webhook.url}:`, error.message);
      }
    });

    await Promise.allSettled(promises);
  }

  getRegisteredWebhooks() {
    return this.registeredWebhooks.map(({ id, url, events }) => ({ id, url, events }));
  }
}

export default new WebhookService();
