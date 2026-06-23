/**
 * Admin foydalanuvchi seed:
 *   node src/seeds/seedAdmin.js
 *
 * Agar foydalanuvchi allaqachon mavjud bo'lsa — parol va rolni yangilaydi.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { User } = require('../models');
const { hashPassword } = require('../utils/crypto');
const { normalizePhone } = require('../utils/phone');

const PHONE = '+998936558959';
const PASSWORD = 'Umidjon';
const ROLE = 'superadmin';
const NAME = 'Admin';

async function run() {
  await connectDB();

  const phone = normalizePhone(PHONE);
  const passwordHash = hashPassword(PASSWORD);

  const existing = await User.findOne({ phone });
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = ROLE;
    existing.name = NAME;
    existing.blocked = false;
    await existing.save();
    console.log(`✅ Mavjud foydalanuvchi yangilandi: ${phone} | rol: ${ROLE}`);
  } else {
    await User.create({ phone, name: NAME, passwordHash, role: ROLE });
    console.log(`✅ Admin yaratildi: ${phone} | parol: ${PASSWORD} | rol: ${ROLE}`);
  }

  await mongoose.disconnect();
}

run().catch((e) => {
  console.error('❌ Xatolik:', e.message);
  process.exit(1);
});
