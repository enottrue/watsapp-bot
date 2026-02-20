#!/usr/bin/env node

/**
 * Скрипт для работы с Bitrix24 API
 * 
 * Использование:
 * 1. Заполните B24_DOMAIN и B24_ACCESS_TOKEN в .env
 * 2. Запустите: node bitrix24-api.js imconnector.list
 * 
 * Для обновления токена:
 * 1. Запустите: node bitrix24-api.js refresh
 * 2. Следуйте инструкциям
 */

import dotenv from 'dotenv';
dotenv.config();

const config = {
  domain: process.env.B24_DOMAIN,
  accessToken: process.env.B24_ACCESS_TOKEN,
  clientId: process.env.B24_CLIENT_ID,
  clientSecret: process.env.B24_CLIENT_SECRET,
};

// Метод из аргументов
const method = process.argv[2] || 'help';

async function refreshToken() {
  console.log('='.repeat(50));
  console.log('Обновление токена Bitrix24');
  console.log('='.repeat(50));

  if (!config.clientId || !config.clientSecret) {
    console.log('\n❌ B24_CLIENT_ID или B24_CLIENT_SECRET не заполнены');
    return;
  }

  console.log('\n📋 Шаг 1: Получение кода авторизации\n');
  
  const authUrl = `https://${config.domain}/oauth/authorize/?client_id=${config.clientId}&response_type=code&redirect_uri=http://localhost:3000/oauth/callback`;
  
  console.log('Откройте в браузере:');
  console.log(authUrl);
  console.log('\nПосле авторизации скопируйте code из URL:');
  console.log('http://localhost:3000/oauth/callback?code=ВАШ_КОД\n');
  console.log('Затем запустите: node bitrix24-api.js token ВАШ_КОД');
}

async function exchangeCodeForToken(code) {
  console.log('\n📋 Шаг 2: Обмен кода на токен\n');
  console.log(`Код: ${code}`);
  
  const tokenUrl = 'https://oauth.bitrix.info/oauth/token/';
  
  try {
    console.log('\n⏳ Запрос токена...');
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
      }),
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.log(`\n❌ ОШИБКА: ${data.error_description || data.error}`);
      return;
    }
    
    console.log('\n✅ Успех! Ваш токен:\n');
    console.log(`B24_ACCESS_TOKEN=${data.access_token}\n`);
    console.log(`refresh_token=${data.refresh_token}\n`);
    console.log(`Срок действия: ${new Date(data.expires_in * 1000)}\n`);
    
    // Обновить .env
    const fs = await import('fs');
    const path = await import('path');
    const envPath = path.resolve('./.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');
    
    if (envContent.includes('B24_ACCESS_TOKEN=')) {
      envContent = envContent.replace(/B24_ACCESS_TOKEN=.*/, `B24_ACCESS_TOKEN=${data.access_token}`);
    } else {
      envContent += `\nB24_ACCESS_TOKEN=${data.access_token}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('Токен сохранён в .env\n');
    
  } catch (error) {
    console.log(`\n❌ ОШИБКА: ${error.message}`);
  }
}

async function callApi(methodName, params = {}) {
  if (!config.domain || !config.accessToken) {
    console.log('\n❌ B24_DOMAIN или B24_ACCESS_TOKEN не заполнены в .env');
    return;
  }

  console.log(`\n🔄 Вызов: ${methodName}`);
  
  const url = `https://${config.domain}/rest/${methodName}?access_token=${config.accessToken}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.log(`❌ ОШИБКА: ${data.error_description || data.error}`);
      return;
    }
    
    console.log('✅ Успех!\n');
    console.log(JSON.stringify(data.result, null, 2));
    
  } catch (error) {
    console.log(`\n❌ ОШИБКА: ${error.message}`);
  }
}

async function main() {
  if (method === 'refresh') {
    await refreshToken();
  } else if (method === 'token' || method === 'exchange') {
    const code = process.argv[3];
    if (!code) {
      console.log('Usage: node bitrix24-api.js token ВАШ_КОД');
    } else {
      await exchangeCodeForToken(code);
    }
  } else if (method === 'help') {
    console.log(`
Bitrix24 API Script

Usage:
  node bitrix24-api.js <method> [params]

Methods:
  refresh              - Получить URL для обновления токена
  token <code>        - Обменять код на токен
  <methodName> [json]  - Вызвать API метод (json опционально)

Examples:
  node bitrix24-api.js refresh
  node bitrix24-api.js token ВАШ_КОД
  node bitrix24-api.js imconnector.list
  node bitrix24-api.js imconnector.status '{"CONNECTOR":"tg_custom"}'
`);
  } else {
    // Считаем что это имя метода API
    const paramsArg = process.argv[3];
    let params = {};
    if (paramsArg) {
      try {
        params = JSON.parse(paramsArg);
      } catch (e) {
        console.log(`❌ Ошибка парсинга JSON: ${e.message}`);
        return;
      }
    }
    await callApi(method, params);
  }
}

main();
