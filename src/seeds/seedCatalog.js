/**
 * Katalog seed: kategoriyalar + detal turlari + sinonimlar.
 *   node src/seeds/seedCatalog.js          # idempotent
 *   node src/seeds/seedCatalog.js --fresh  # tozalab qaytadan
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { PartCategory, PartType, Synonym } = require('../models');

const FRESH = process.argv.includes('--fresh');
const load = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, 'data', n), 'utf-8'));
const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

async function run() {
  await connectDB();

  if (FRESH) {
    await Promise.all([PartCategory.deleteMany({}), PartType.deleteMany({}), Synonym.deleteMany({})]);
    console.log('🧹 Katalog kolleksiyalari tozalandi');
  }

  // 1. Kategoriyalar
  const categories = load('categories.json');
  await PartCategory.bulkWrite(categories.map((c) => ({
    updateOne: { filter: { slug: c.slug }, update: { $set: { name: c.name, icon: c.icon, order: c.order } }, upsert: true },
  })));
  const catDocs = await PartCategory.find({}, { slug: 1 }).lean();
  const catMap = new Map(catDocs.map((c) => [c.slug, c._id]));
  console.log(`📁 Kategoriyalar: ${categories.length}`);

  // 2. Detal turlari
  const partTypes = load('partTypes.json');
  const ptOps = [];
  for (const p of partTypes) {
    const categoryId = catMap.get(p.categorySlug);
    if (!categoryId) continue;
    ptOps.push({
      updateOne: {
        filter: { slug: p.slug },
        update: { $set: { name: p.name, slug: p.slug, categoryId, subcategory: p.subcategory || null, synonyms: p.synonyms || [] } },
        upsert: true,
      },
    });
  }
  await PartType.bulkWrite(ptOps);
  console.log(`🔩 Detal turlari: ${ptOps.length}`);

  // 3. Sinonimlar
  const ptDocs = await PartType.find({}, { name: 1, slug: 1 }).lean();
  const ptByName = new Map(ptDocs.map((p) => [norm(p.name), p._id]));
  const ptBySlug = new Map(ptDocs.map((p) => [p.slug, p._id]));
  const synonyms = load('synonyms.json');
  await Synonym.bulkWrite(synonyms.map((s) => {
    let partTypeId = s.partTypeSlug ? ptBySlug.get(s.partTypeSlug) : null;
    if (!partTypeId) {
      for (const t of [s.canonical, ...(s.aliases || [])]) {
        if (ptByName.has(norm(t))) { partTypeId = ptByName.get(norm(t)); break; }
      }
    }
    return {
      updateOne: {
        filter: { canonical: s.canonical },
        update: { $set: { canonical: s.canonical, aliases: s.aliases || [], ambiguous: !!s.ambiguous, note: s.note || undefined, partTypeId: partTypeId || null } },
        upsert: true,
      },
    };
  }));
  console.log(`🔤 Sinonimlar: ${synonyms.length}`);

  await Promise.all([PartCategory.syncIndexes(), PartType.syncIndexes(), Synonym.syncIndexes()]);
  console.log('🧭 Indekslar yangilandi');
  console.log('✅ Katalog seed tugadi');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => { console.error('❌', e); process.exit(1); });
