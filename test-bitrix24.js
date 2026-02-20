#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

const config = {
  domain: process.env.B24_DOMAIN,
  accessToken: process.env.B24_ACCESS_TOKEN,
  clientId: process.env.B24_CLIENT_ID,
  clientSecret: process.env.B24_CLIENT_SECRET,
};

async function testBitrix24() {
  console.log('='.repeat(50));
  console.log('Тест подключения к Битрикс24');
  console.log('='.repeat(50));

  if (!config.domain) {
    console.log('\n❌ B24_DOMAIN не заполнен в .env');
    return;
  }

  console.log(`\n📡 Домен: ${config.domain}`);

  let baseUrl;

  // Проверяем что токен не пустой
  if (config.accessToken && config.accessToken.trim()) {
    baseUrl = `https://${config.domain}/rest/1/${config.accessToken}`;
    console.log('🔑 Метод: accessToken');
  } else if (config.clientId && config.clientSecret) {
    baseUrl = `https://${config.domain}/rest/${config.clientId}/${config.clientSecret}`;
    console.log('🔑 Метод: clientId + clientSecret');
  } else {
    console.log('\n❌ Нет данных для авторизации');
    return;
  }

  try {
    console.log('\n🧪 Получение пользователя...');
    const userRes = await fetch(`${baseUrl}/user.current`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const userData = await userRes.json();

    if (userData.error) {
      throw new Error(userData.error_description || userData.error);
    }

    console.log(`✅ Пользователь: ${userData.result.name} (ID: ${userData.result.ID})`);

    console.log('\n🧪 Получение коннекторов...');
    const connRes = await fetch(`${baseUrl}/imconnector.list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ CONNECTOR: 'all' })
    });
    const connData = await connRes.json();

    if (connData.error) {
      console.log(`⚠️  ${connData.error_description || connData.error}`);
    } else {
      const count = Array.isArray(connData.result) ? connData.result.length : 0;
      console.log(`✅ Коннекторов: ${count}`);
    }

    console.log('\n🧪 Получение открытых линий...');
    const linesRes = await fetch(`${baseUrl}/im.openlines.get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const linesData = await linesRes.json();

    if (linesData.error) {
      console.log(`⚠️  ${linesData.error_description || linesData.error}`);
    } else {
      const count = linesData.result?.length || 0;
      console.log(`✅ Открытых линий: ${count}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Готово!');
    console.log('='.repeat(50));

  } catch (error) {
    console.log(`\n❌ ОШИБКА: ${error.message}`);
  }
}

testBitrix24();
