import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// OAuth callback - автоматически получает токен
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  const domain = process.env.B24_DOMAIN;
  const clientId = process.env.B24_CLIENT_ID;
  const clientSecret = process.env.B24_CLIENT_SECRET;
  const redirectUri = `${req.protocol}://${req.get('host')}/oauth/callback`;

  if (!code) {
    return res.send(`
      <html>
        <body>
          <h1>Ошибка: код не получен</h1>
          <p>Проверьте URL: должен быть параметр ?code=...</p>
        </body>
      </html>
    `);
  }

  try {
    // Обменять code на token
    const tokenUrl = `https://${domain}/oauth/token/?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    const response = await fetch(tokenUrl, { method: 'POST' });
    const data = await response.json();

    if (data.error) {
      return res.send(`
        <html>
          <body>
            <h1>Ошибка: ${data.error}</h1>
            <p>${data.error_description || ''}</p>
          </body>
        </html>
      `);
    }

    // Обновить .env файл
    const envPath = path.resolve(__dirname, '../../.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');

    // Обновить или добавить B24_ACCESS_TOKEN
    if (envContent.includes('B24_ACCESS_TOKEN=')) {
      envContent = envContent.replace(
        /B24_ACCESS_TOKEN=.*/,
        `B24_ACCESS_TOKEN=${data.access_token}`
      );
    } else {
      envContent += `\nB24_ACCESS_TOKEN=${data.access_token}`;
    }

    fs.writeFileSync(envPath, envContent);

    res.send(`
      <html>
        <body>
          <h1>✅ Токен получен!</h1>
          <p>Токен сохранён в .env файл</p>
          <p>Срок действия: ${new Date(data.expires_in * 1000)}</p>
          <p>Можете закрыть это окно и запустить тест:</p>
          <pre>node test-bitrix24.js</pre>
        </body>
      </html>
    `);

    console.log('\n✅ OAuth токен получен и сохранён!\n');

  } catch (error) {
    res.send(`
      <html>
        <body>
          <h1>Ошибка: ${error.message}</h1>
        </body>
      </html>
    `);
  }
});

export default router;
