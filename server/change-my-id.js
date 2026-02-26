#!/usr/bin/env node

/**
 * СКРИПТ ДЛЯ ИЗМЕНЕНИЯ СВОЕГО УНИКАЛЬНОГО ID
 * 
 * Использование:
 * node change-my-id.js <email> <новый-ID>
 * 
 * Пример:
 * node change-my-id.js myemail@gmail.com OWNERUNITEST
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./models/User');

async function changeId(email, newId) {
  try {
    // Validate input
    if (!email || !newId) {
      console.log('❌ Ошибка: укажите email и новый ID');
      console.log('   Использование: node change-my-id.js <email> <новый-ID>');
      process.exit(1);
    }

    if (newId.length < 3 || newId.length > 20) {
      console.log('❌ Ошибка: ID должен быть от 3 до 20 символов');
      process.exit(1);
    }

    // Check MongoDB URI
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.log('❌ Ошибка: MONGODB_URI не найден в .env');
      process.exit(1);
    }

    console.log('🔗 Подключение к БД...');
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Подключено к БД');

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`❌ Пользователь с email ${email} не найден`);
      process.exit(1);
    }

    // Check if ID already taken
    const existingUser = await User.findOne({ uniqueId: newId.toUpperCase() });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      console.log(`❌ Ошибка: ID "${newId}" уже используется другим пользователем`);
      process.exit(1);
    }

    // Update
    const oldId = user.uniqueId;
    user.uniqueId = newId.toUpperCase();
    await user.save();

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║         ID УСПЕШНО ИЗМЕНЁН ✅              ║');
    console.log('╠════════════════════════════════════════════╣');
    console.log(`║ Пользователь: ${user.firstName} ${user.lastName}`);
    console.log(`║ Email:        ${user.email}`);
    console.log(`║ Старый ID:    ${oldId}`);
    console.log(`║ Новый ID:     ${user.uniqueId}`);
    console.log('╚════════════════════════════════════════════╝\n');

    console.log('💡 Теперь вы можете использовать этот ID для активации админ прав');
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
changeId(args[0], args[1]);
