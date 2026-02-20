#!/usr/bin/env node

/**
 * Скрипт для получения списка IM-коннекторов (открытых линий) из Bitrix24
 * 
 * Использование:
 * 1. Заполните B24_DOMAIN и B24_ACCESS_TOKEN в .env
 * 2. Запустите: node list-connectors.js
 */

import dotenv from 'dotenv';
dotenv.config();

const config = {
  domain: process.env.B24_DOMAIN || process.env.BITRIX24_DOMAIN,
  accessToken: process.env.B24_ACCESS_TOKEN || process.env.BITRIX24_ACCESS_TOKEN,
  clientId: process.env.B24_CLIENT_ID || process.env.BITRIX24_CLIENT_ID,
  clientSecret: process.env.B24_CLIENT_SECRET || process.env.BITRIX24_CLIENT_SECRET,
};

async function listConnectors() {
  console.log('='.repeat(50));
  console.log('Список IM-коннекторов Bitrix24');
  console.log('='.repeat(50));

  if (!config.domain) {
    console.log('\n❌ B24_DOMAIN не заполнен в .env');
    console.log('Добавьте: B24_DOMAIN=ваш-портал.bitrix24.ru');
    return;
  }

  console.log(`\n📡 Домен: ${config.domain}`);

  let baseUrl;

  if (config.accessToken && config.accessToken.trim()) {
    baseUrl = `https://${config.domain}/rest/1/${config.accessToken}`;
    console.log('🔑 Метод: accessToken');
  } else if (config.clientId && config.clientSecret) {
    baseUrl = `https://${config.domain}/rest/${config.clientId}/${config.clientSecret}`;
    console.log('🔑 Метод: clientId + clientSecret (локальное приложение)');
  } else {
    console.log('\n❌ Нет данных для авторизации');
    console.log('Добавьте B24_ACCESS_TOKEN или B24_CLIENT_ID + B24_CLIENT_SECRET в .env');
    return;
  }

  try {
    console.log('\n🔄 Получение списка коннекторов...\n');

    const response = await fetch(apiUrl || `${baseUrl}/imconnector.list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ CONNECTOR: 'all' })
    });

    const data = await response.json();

    if (data.error) {
      console.log(`❌ ОШИБКА: ${data.error_description || data.error}`);
      
      if (data.error === 'expired_token') {
        console.log('\n⚠️  Токен истёк! Обновите токен:');
        console.log('   1. Запустите приложение для обновления токена');
        console.log('   2. Или получите новый токен: node get-b24-token.js');
      }
      return;
    }

    const result = data.result;

    if (!result || (Array.isArray(result) && result.length === 0)) {
      console.log('📭 Коннекторы не найдены (список пуст)');
      return;
    }

    console.log('📋 Список коннекторов:\n');

    if (Array.isArray(result)) {
      // Массив коннекторов
      result.forEach((connector, index) => {
        console.log(`  ${index + 1}. ${connector.NAME || connector.ID || 'Без названия'}`);
        if (connector.ID) console.log(`     ID: ${connector.ID}`);
      });
    } else if (typeof result === 'object') {
      // Объект "код → название"
      Object.entries(result).forEach(([code, info]) => {
        const name = typeof info === 'string' ? info : info?.NAME || code;
        console.log(`  • ${code}: ${name}`);
      });
    }

    console.log(`\n✅ Всего коннекторов: ${Array.isArray(result) ? result.length : Object.keys(result).length}`);

  } catch (error) {
    console.log(`\n❌ ОШИБКА: ${error.message}`);
  }
}

listConnectors();
