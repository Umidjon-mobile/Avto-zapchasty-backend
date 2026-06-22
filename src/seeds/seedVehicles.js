/**
 * Mashina taksonomiyasi (brend + model) va shaharlar seedi.
 *   node src/seeds/seedVehicles.js [--fresh]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const slugify = require('../utils/slugify');
const { Brand, CarModel, City } = require('../models');

const FRESH = process.argv.includes('--fresh');
const load = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, 'data', n), 'utf-8'));

const CITIES = [
  ['Toshkent', 'Ташкент', 'Toshkent'],
  ['Samarqand', 'Самарканд', 'Samarqand'],
  ['Buxoro', 'Бухара', 'Buxoro'],
  ['Andijon', 'Андижан', 'Andijon'],
  ["Farg'ona", 'Фергана', "Farg'ona"],
  ['Namangan', 'Наманган', 'Namangan'],
  ['Qashqadaryo', 'Кашкадарья', 'Qarshi'],
  ['Surxondaryo', 'Сурхандарья', 'Termiz'],
  ['Jizzax', 'Джизак', 'Jizzax'],
  ['Sirdaryo', 'Сырдарья', 'Guliston'],
  ['Navoiy', 'Навои', 'Navoiy'],
  ['Xorazm', 'Хорезм', 'Urganch'],
  ["Qoraqalpog'iston", 'Каракалпакстан', 'Nukus'],
];

async function run() {
  await connectDB();

  if (FRESH) {
    await Promise.all([Brand.deleteMany({}), CarModel.deleteMany({}), City.deleteMany({})]);
    console.log('🧹 Mashina/shahar kolleksiyalari tozalandi');
  }

  // Brendlar
  const brands = load('brands.json');
  await Brand.bulkWrite(brands.map((b) => ({
    updateOne: { filter: { slug: b.slug }, update: { $set: { name: b.name, slug: b.slug, country: b.country, popular: b.popular, order: b.order } }, upsert: true },
  })));
  const brandDocs = await Brand.find({}, { slug: 1 }).lean();
  const brandMap = new Map(brandDocs.map((b) => [b.slug, b._id]));
  console.log(`🚗 Brendlar: ${brands.length}`);

  // Modellar
  let modelCount = 0;
  const modelOps = [];
  for (const b of brands) {
    const brandId = brandMap.get(b.slug);
    for (const m of b.models || []) {
      modelOps.push({
        updateOne: {
          filter: { brandId, slug: m.slug },
          update: { $set: { brandId, name: m.name, slug: m.slug } },
          upsert: true,
        },
      });
      modelCount++;
    }
  }
  if (modelOps.length) await CarModel.bulkWrite(modelOps);
  console.log(`🚙 Modellar: ${modelCount}`);

  // Shaharlar
  await City.bulkWrite(CITIES.map(([uz, ru, region], i) => ({
    updateOne: { filter: { slug: slugify(uz) }, update: { $set: { name: { uz, ru }, slug: slugify(uz), region, order: i } }, upsert: true },
  })));
  console.log(`🏙️  Shaharlar: ${CITIES.length}`);

  await Promise.all([Brand.syncIndexes(), CarModel.syncIndexes(), City.syncIndexes()]);
  console.log('✅ Mashina/shahar seed tugadi');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => { console.error('❌', e); process.exit(1); });
