/**
 * Отправка QR-кода WhatsApp в Telegram (для авторизации при запуске на сервере).
 * Используется только если заданы TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID.
 */
import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config/index.js';

export async function sendQrToTelegram(dataUrl, caption = 'Отсканируйте QR для авторизации WhatsApp') {
  const { botToken, chatId } = config.telegram;
  if (!botToken || !chatId) return;

  try {
    const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('photo', buffer, { filename: 'whatsapp-qr.png' });
    form.append('caption', caption);

    await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
    });
    console.log('QR code sent to Telegram');
  } catch (err) {
    console.error('Failed to send QR to Telegram:', err.response?.data || err.message);
  }
}
