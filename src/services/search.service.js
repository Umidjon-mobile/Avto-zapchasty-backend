const { Synonym, PartType, Listing, PartCategory } = require('../models');
const { escapeRegex } = require('../utils/crypto');

const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

// Bitta token OEM ga o'xshaydimi? (6+ belgi, kamida bitta raqam)
function looksLikeOem(raw) {
  const compact = String(raw).replace(/[\s\-./]/g, '');
  return /^[A-Za-z0-9]{6,}$/.test(compact) && /\d/.test(compact);
}

// So'rovdagi tokenlarni sinonim lug'ati bo'yicha kengaytirish (ikki tomonlama)
async function expandTerms(query) {
  const tokens = norm(query).split(' ').filter(Boolean);
  if (!tokens.length) return [];
  const groups = await Synonym.find({
    $or: [{ canonical: { $in: tokens } }, { aliases: { $in: tokens } }],
  }).lean();
  const expanded = new Set(tokens);
  for (const g of groups) {
    expanded.add(norm(g.canonical));
    (g.aliases || []).forEach((a) => expanded.add(norm(a)));
  }
  return [...expanded];
}

const SORT_MAP = {
  newest: { createdAt: -1 },
  cheap: { 'price.amount': 1 },
  expensive: { 'price.amount': -1 },
};

// Asosiy qidiruv
async function searchListings(params) {
  const {
    q, categoryId, partTypeId, brandId, modelId, condition, city,
    minPrice, maxPrice, sort, page = 1, limit = 20,
  } = params;

  const filter = { status: 'active' };
  if (categoryId) {
    const cat = await PartCategory.findById(categoryId, { level: 1 }).lean();
    if (cat && cat.level === 1) {
      const children = await PartCategory.find({ parentId: categoryId }, { _id: 1 }).lean();
      const ids = children.map((c) => c._id);
      filter.categoryId = ids.length ? { $in: ids } : categoryId;
    } else {
      filter.categoryId = categoryId;
    }
  }
  if (partTypeId) filter.partTypeId = partTypeId;
  if (brandId) filter['fitment.brandId'] = brandId;
  if (modelId) filter['fitment.modelId'] = modelId;
  if (condition) filter.condition = condition;
  if (city) filter.city = city;
  if (minPrice != null || maxPrice != null) {
    filter['price.amount'] = {};
    if (minPrice != null) filter['price.amount'].$gte = Number(minPrice);
    if (maxPrice != null) filter['price.amount'].$lte = Number(maxPrice);
  }

  let useTextScore = false;

  if (q && q.trim()) {
    const raw = q.trim();
    // Faqat ehtiyot qism nomi bo'yicha qidiruv (OEM bo'yicha qidiruv o'chirilgan).
    // Sinonim lug'ati bilan kengaytirilgan full-text qidiruv.
    const expanded = await expandTerms(raw);
    filter.$text = { $search: expanded.join(' ') };
    useTextScore = true;
  }

  const skip = (page - 1) * limit;
  let query = Listing.find(filter);

  if (useTextScore && (!sort || sort === 'relevance')) {
    query = query
      .select({ score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } });
  } else {
    query = query.sort(SORT_MAP[sort] || { createdAt: -1 });
  }

  const [items, total] = await Promise.all([
    query
      .skip(skip)
      .limit(limit)
      .populate('partTypeId', 'name slug')
      .populate('categoryId', 'name slug')
      .populate('fitment.brandId', 'name slug')
      .populate('fitment.modelId', 'name slug')
      .lean(),
    Listing.countDocuments(filter),
  ]);

  return { items, total, page, pages: Math.ceil(total / limit) || 1 };
}

// Autocomplete — detal nomlari va sinonimlar bo'yicha
async function suggest(q, limit = 10) {
  const t = norm(q);
  if (t.length < 2) return [];
  const rx = new RegExp(escapeRegex(t), 'i');
  const parts = await PartType.find({ $or: [{ name: rx }, { synonyms: rx }] })
    .limit(limit)
    .select('name slug categoryId')
    .lean();
  return parts;
}

// OEM bo'yicha to'g'ridan-to'g'ri qidiruv
async function searchByOem(oem, { page = 1, limit = 20 } = {}) {
  const oemq = String(oem).replace(/[^a-z0-9]/gi, '').toUpperCase();
  const filter = {
    status: 'active',
    oemNormalized: { $elemMatch: { $regex: '^' + escapeRegex(oemq) } },
  };
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Listing.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('partTypeId', 'name slug')
      .lean(),
    Listing.countDocuments(filter),
  ]);
  return { items, total, page, pages: Math.ceil(total / limit) || 1 };
}

module.exports = { searchListings, suggest, searchByOem, expandTerms, looksLikeOem };
