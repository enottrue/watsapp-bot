import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { config } from '../../config/index.js';
import webhookService from '../../services/webhook.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UnofficialWhatsAppService {
  constructor() {
    this.sock = null;
    this.isReady = false;
    this.messageCallbacks = [];
    this.ownMessageCallbacks = []; // Добавлено для обработки сообщений от себя
    this.sessionPath = path.resolve(__dirname, '../../..', config.unofficial.sessionPath);
    /** Текущий QR для авторизации (для отдачи по HTTP / отправки в Telegram) */
    this.currentQr = null;
    this.currentQrDataUrl = null;
    this.qrCallbacks = [];

    // Создаем директорию для сессий если её нет
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }

    // Логгер для Baileys
    this.logger = pino({ level: 'silent' }); // Можно изменить на 'info' для отладки
  }

  async initialize() {
    return new Promise(async (resolve, reject) => {
      try {
        this._initialized = false;

        // Загружаем состояние аутентификации
        const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

        // Получаем последнюю версию Baileys
        const { version } = await fetchLatestBaileysVersion();
        console.log('Using Baileys version:', version.join('.'));

        // Создаем сокет
        this.sock = makeWASocket({
          version,
          logger: this.logger,
          auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, this.logger),
          },
          browser: Browsers.macOS('Desktop'),
          generateHighQualityLinkPreview: true,
          syncFullHistory: false,
        });

        // Сохраняем учетные данные при обновлении
        this.sock.ev.on('creds.update', saveCreds);

        // Обработка QR кода
        this.sock.ev.on('connection.update', (update) => {
          const { connection, lastDisconnect, qr } = update;

          if (qr) {
            console.log('QR Code received, scan it with your WhatsApp:');
            qrcode.generate(qr, { small: true });
            this.currentQr = qr;
            QRCode.toDataURL(qr, { type: 'image/png', margin: 2 }).then((dataUrl) => {
              this.currentQrDataUrl = dataUrl;
              this.qrCallbacks.forEach((cb) => {
                try { cb(qr, dataUrl); } catch (e) { console.error('QR callback error:', e); }
              });
            }).catch((e) => console.error('QR toDataURL error:', e));
          }

          if (connection === 'close') {
            const error = lastDisconnect?.error;
            const statusCode = error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
              console.log('Connection closed, reconnecting...');
              if (error) {
                console.log('Disconnect reason:', error);
                console.log('Status code:', statusCode);
              }
              this.isReady = false;
              this.initialize().catch(reject);
            } else {
              console.log('Connection closed. Please scan QR code again.');
              this.isReady = false;
              this._initialized = false;
              // Удаляем сессию для повторной авторизации
              this.clearSession();
              reject(new Error('Logged out. Please scan QR code again.'));
            }
          } else if (connection === 'open') {
            this.currentQr = null;
            this.currentQrDataUrl = null;
            console.log('WhatsApp client is ready!');
            this.isReady = true;
            if (!this._initialized) {
              this._initialized = true;
              resolve();
            }
          }

          if (connection === 'connecting') {
            console.log('Connecting to WhatsApp...');
          }
        });

        // Обработка входящих сообщений
        this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
          if (type === 'notify') {
            for (const msg of messages) {
              const messageData = await this.formatMessage(msg);
              
              // Если сообщение отправлено нами - вызываем ownMessageCallbacks
              if (msg.key.fromMe) {
                console.log('📤 Own message detected, key:', msg.key.id);
                
                const callbacks = Array.isArray(this.ownMessageCallbacks) 
                  ? this.ownMessageCallbacks.filter(cb => typeof cb === 'function')
                  : (typeof this.ownMessageCallbacks === 'function' ? [this.ownMessageCallbacks] : []);
                
                console.log('📤 Number of ownMessageCallbacks:', callbacks.length);
                
                callbacks.forEach(callback => {
                  try {
                    callback(messageData);
                  } catch (error) {
                    console.error('Error in own message callback:', error);
                  }
                });
                
                // Уведомляем вебхуки о собственном сообщении
                webhookService.notifyWebhooks('own_message', messageData);
              } else {
                // Сообщение от другого человека
                this.messageCallbacks.forEach(callback => {
                  try {
                    callback(messageData);
                  } catch (error) {
                    console.error('Error in message callback:', error);
                  }
                });
              }
            }
          }
        });

        // Обработка ошибок
        this.sock.ev.on('connection.update', (update) => {
          if (update.connection === 'close') {
            const error = update.lastDisconnect?.error;
            const statusCode = error?.output?.statusCode;

            if (statusCode === DisconnectReason.badSession) {
              console.error('Bad session. Clearing session data...');
              this.clearSession();
            }
          }
        });

      } catch (error) {
        console.error('Error initializing WhatsApp client:', error);
        reject(error);
      }
    });
  }

  async formatMessage(msg) {
    try {
      const jid = msg.key.remoteJid;
      const isGroup = jid?.endsWith('@g.us') || false;

      // Получаем информацию о контакте
      let contactName = 'Unknown';
      let contactNumber = jid?.split('@')[0] || '';

      if (this.sock && jid) {
        try {
          const contact = await this.sock.onWhatsApp(jid);
          if (contact && contact[0]) {
            contactNumber = contact[0].jid.split('@')[0];
          }
        } catch (e) {
          // Игнорируем ошибки получения контакта
        }
      }

      // Извлекаем текст сообщения
      let body = '';
      let hasMedia = false;
      let mediaType = 'text';

      if (msg.message) {
        if (msg.message.conversation) {
          body = msg.message.conversation;
        } else if (msg.message.extendedTextMessage) {
          body = msg.message.extendedTextMessage.text || '';
        } else if (msg.message.imageMessage) {
          body = msg.message.imageMessage.caption || '';
          hasMedia = true;
          mediaType = 'image';
        } else if (msg.message.videoMessage) {
          body = msg.message.videoMessage.caption || '';
          hasMedia = true;
          mediaType = 'video';
        } else if (msg.message.audioMessage) {
          hasMedia = true;
          mediaType = 'audio';
        } else if (msg.message.documentMessage) {
          body = msg.message.documentMessage.caption || '';
          hasMedia = true;
          mediaType = 'document';
        }
      }

      return {
        id: msg.key.id,
        from: jid || '',
        to: msg.key.participant || jid || '',
        body: body,
        timestamp: msg.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now(),
        isGroup: isGroup,
        contact: {
          name: contactName,
          number: contactNumber
        },
        hasMedia: hasMedia,
        type: mediaType,
        raw: msg
      };
    } catch (error) {
      console.error('Error formatting message:', error);
      return {
        id: msg.key?.id || '',
        from: msg.key?.remoteJid || '',
        body: '',
        timestamp: Date.now(),
        isGroup: false,
        contact: { name: 'Unknown', number: '' },
        hasMedia: false,
        type: 'text',
        raw: msg
      };
    }
  }

  async sendMessage(phone, message, options = {}) {
    if (!this.isReady || !this.sock) {
      throw new Error('WhatsApp client is not ready. Please wait for initialization.');
    }

    try {
      // Форматируем номер телефона
      const formattedPhone = this.formatPhoneNumber(phone);

      const result = await this.sock.sendMessage(formattedPhone, { text: message });

      return {
        success: true,
        messageId: result.key.id,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async sendMedia(phone, mediaPath, options = {}) {
    if (!this.isReady || !this.sock) {
      throw new Error('WhatsApp client is not ready. Please wait for initialization.');
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);

      // Читаем файл
      const fileBuffer = fs.readFileSync(mediaPath);
      const mimeType = this.getMimeType(mediaPath);

      // Определяем тип медиа
      let mediaMessage;
      if (mimeType.startsWith('image/')) {
        mediaMessage = {
          image: fileBuffer,
          caption: options.caption || ''
        };
      } else if (mimeType.startsWith('video/')) {
        mediaMessage = {
          video: fileBuffer,
          caption: options.caption || ''
        };
      } else if (mimeType.startsWith('audio/')) {
        mediaMessage = {
          audio: fileBuffer,
          mimetype: mimeType,
          ptt: mimeType.includes('ogg') || mimeType.includes('opus')
        };
      } else {
        // Документ
        const fileName = path.basename(mediaPath);
        mediaMessage = {
          document: fileBuffer,
          mimetype: mimeType,
          fileName: fileName,
          caption: options.caption || ''
        };
      }

      const result = await this.sock.sendMessage(formattedPhone, mediaMessage);

      return {
        success: true,
        messageId: result.key.id,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error sending media:', error);
      throw new Error(`Failed to send media: ${error.message}`);
    }
  }

  async getGroups() {
    if (!this.isReady || !this.sock) {
      throw new Error('WhatsApp client is not ready. Please wait for initialization.');
    }

    try {
      const groups = await this.sock.groupFetchAllParticipating();

      return Object.values(groups).map(group => ({
        id: group.id,
        name: group.subject || 'Unnamed Group',
        participants: group.participants?.length || 0,
        description: group.desc || ''
      }));
    } catch (error) {
      console.error('Error getting groups:', error);
      throw new Error(`Failed to get groups: ${error.message}`);
    }
  }

  async sendMessageToGroup(groupId, message) {
    if (!this.isReady || !this.sock) {
      throw new Error('WhatsApp client is not ready. Please wait for initialization.');
    }

    try {
      // Убеждаемся, что groupId имеет правильный формат
      const formattedGroupId = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;

      const result = await this.sock.sendMessage(formattedGroupId, { text: message });

      return {
        success: true,
        messageId: result.key.id,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error sending message to group:', error);
      throw new Error(`Failed to send message to group: ${error.message}`);
    }
  }

  async onMessage(callback) {
    this.messageCallbacks.push(callback);
  }

  // Callback для сообщений отправленных самим собой
  onOwnMessage(callback) {
    // Поддерживает как массив, так и одиночный callback
    if (Array.isArray(callback)) {
      this.ownMessageCallbacks = callback;
    } else {
      this.ownMessageCallbacks = [callback];
    }
  }

  async getMessageById(messageId) {
    if (!this.sock) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      // Получаем сообщение из кэша Baileys
      const message = await this.sock.loadMessage(messageId);
      
      if (message) {
        return await this.formatMessage(message);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting message by ID:', error);
      return null;
    }
  }

  formatPhoneNumber(phone) {
    // Убираем все нецифровые символы
    let cleaned = phone.replace(/[^\d]/g, '');

    // Если номер начинается с 8, заменяем на 7 (российский формат)
    if (cleaned.startsWith('8')) {
      cleaned = '7' + cleaned.substring(1);
    }

    // Если номер не начинается с кода страны, добавляем 7 (российский)
    if (!cleaned.startsWith('7') && cleaned.length === 10) {
      cleaned = '7' + cleaned;
    }

    // Для Baileys номер должен быть БЕЗ знака + перед @s.whatsapp.net
    // Добавляем @s.whatsapp.net для личных чатов или @g.us для групп
    if (!cleaned.includes('@')) {
      cleaned += '@s.whatsapp.net';
    }

    return cleaned;
  }

  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.opus': 'audio/opus',
      '.wav': 'audio/wav',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /** Возвращает текущий QR для отображения по HTTP (если ожидается сканирование) */
  getCurrentQr() {
    return this.currentQr
      ? { qr: this.currentQr, dataUrl: this.currentQrDataUrl }
      : null;
  }

  /** Подписаться на появление нового QR (например, для отправки в Telegram) */
  onQr(callback) {
    if (typeof callback === 'function') this.qrCallbacks.push(callback);
  }

  clearSession() {
    try {
      const files = fs.readdirSync(this.sessionPath);
      for (const file of files) {
        fs.unlinkSync(path.join(this.sessionPath, file));
      }
      console.log('Session cleared');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  async getClientInfo() {
    if (!this.sock) {
      return { ready: false, status: 'not_initialized' };
    }

    if (!this.isReady) {
      return { ready: false, status: 'initializing' };
    }

    try {
      const me = this.sock.user;
      if (!me || !me.id) {
        return { ready: false, status: 'not_authenticated' };
      }

      return {
        ready: true,
        status: 'ready',
        wid: me.id,
        pushname: me.name || '',
        platform: 'Baileys'
      };
    } catch (error) {
      return { ready: false, status: 'error', error: error.message };
    }
  }

  async disconnect() {
    if (this.sock) {
      await this.sock.end(undefined);
      this.isReady = false;
      this.sock = null;
    }
  }
}

export default UnofficialWhatsAppService;
