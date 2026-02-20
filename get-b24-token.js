#!/usr/bin/env node

/**
 * Скрипт для получения токена Битрикс24 через OAuth
 * 
 * Использование:
 * 1. Заполните B24_DOMAIN, B24_CLIENT_ID, B24_CLIENT_SECRET в .env
 * 2. Запустите: node get-b24-token.js
 * 3. Скопируйте полученный code из URL браузера
 * 4. Вставьте code в .env файл
 * 
 * После получения code токен можно обменять через API
 */

import dotenv from 'dotenv';
dotenv.config();

const config = {
  domain: process.env.B24_DOMAIN,
  clientId: process.env.B24_CLIENT_ID,
  clientSecret: process.env.B24_CLIENT_SECRET,
  redirectUri: process.env.B24_REDIRECT_URI || 'http://localhost:3000/oauth/callback',
};

console.log('='.repeat(50));
console.log('Получение токена Битрикс24');
console.log('='.repeat(50));

// Проверка настроек
if (!config.domain || !config.clientId || !config.clientSecret) {
  console.log('\n❌ ОШИБКА: Заполните .env файл:');
  console.log('\nДобавьте:');
  console.log('B24_DOMAIN=ваш-портал.bitrix24.ru');
  console.log('B24_CLIENT_ID=ваш_client_id');
  console.log('B24_CLIENT_SECRET=ваш_client_secret');
  console.log('\nГде взять client_id и client_secret:');
  console.log('1. Зайдите в ваш портал Битрикс24');
  console.log('2. Приложения → Интеграции → Добавить приложение');
  console.log('3. Создайте приложение с правами CRM, im, users');
  console.log('4. Скопируйте код и ключ приложения');
  process.exit(1);
}

// Если передан code как аргумент - обменять на токен
const code = process.argv[2];

if (code) {
  // Обменять code на токен
  exchangeCodeForToken(code);
} else {
  // Показать URL для получения code
  showAuthUrl();
}

function showAuthUrl() {
  console.log('\n📋 Шаг 1: Получение кода авторизации\n');
  
  const authUrl = `https://${config.domain}/oauth/authorize/?client_id=${config.clientId}&response_type=code&redirect_uri=${encodeURIComponent(config.redirectUri)}`;
  
  console.log('Откройте эту ссылку в браузере:');
  console.log(`\n${authUrl}\n`);
  
  console.log('После авторизации вы будете перенаправлены на:');
  console.log(`${config.redirectUri}?code=ВАШ_КОД_ЗДЕСЬ`);
  console.log('\n📋 Шаг 2: Получение токена\n');
  console.log('Скопируйте код из URL и запустите:');
  console.log(`node get-b24-token.js ВАШ_КОД`);
}

async function exchangeCodeForToken(code) {
  console.log('\n📋 Шаг 2: Обмен кода на токен\n');
  console.log(`Код: ${code}`);
  
  const tokenUrl = `https://${config.domain}/oauth/token/?grant_type=authorization_code&client_id=${config.clientId}&client_secret=${config.clientSecret}&code=${code}&redirect_uri=${encodeURIComponent(config.redirectUri)}`;
  
  try {
    console.log('\n⏳ Запрос токена...');
    
    const response = await fetch(tokenUrl, { method: 'POST' });
    const data = await response.json();
    
    if (data.error) {
      console.log(`\n❌ ОШИБКА: ${data.error_description || data.error}`);
      console.log('\nВозможные причины:');
      console.log('1. Код уже использован (нужен новый)');
      console.log('2. Истёк срок действия кода');
      console.log('3. Неверный client_secret');
      process.exit(1);
    }
    
    console.log('\n✅ Успех! Ваш токен:\n');
    console.log(`B24_ACCESS_TOKEN=${data.access_token}\n`);
    console.log('Добавьте этот токен в .env файл:');
    console.log(`\nB24_DOMAIN=${config.domain}`);
    console.log(`B24_ACCESS_TOKEN=${data.access_token}`);
    console.log(`\nСрок действия токена: ${new Date(data.expires_in * 1000)}`);
    
  } catch (error) {
    console.log(`\n❌ ОШИБКА: ${error.message}`);
  }
}
