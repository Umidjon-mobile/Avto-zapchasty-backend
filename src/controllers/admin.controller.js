const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const slugify = require('../utils/slugify');
const { escapeRegex } = require('../utils/crypto');
const { notifyUser, sendPush } = require('../services/push.service');
const {
  Brand, CarModel, Generation, Engine, City,
  PartCategory, PartType, Synonym, Listing, User, Report,
} = require('../models');

// ---------- Universal CRUD fabrikasi ----------
function crud(Model, { slugFn } = {}) {
  return {
    create: asyncHandler(async (req, res) => {
      const data = { ...req.body };
      if (slugFn && !data.slug) data.slug = slugFn(data);
      const item = await Model.create(data);
      res.status(201).json({ item });
    }),
    update: asyncHandler(async (req, res) => {
      const item = await Model.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      );
      if (!item) throw ApiError.notFound();
      res.json({ item });
    }),
    remove: asyncHandler(async (req, res) => {
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) throw ApiError.notFound();
      res.json({ ok: true });
    }),
  };
}

const brands = crud(Brand, { slugFn: (d) => slugify(d.name) });
const models = crud(CarModel, { slugFn: (d) => slugify(d.name) });
const generations = crud(Generation);
const engines = crud(Engine);
const categories = crud(PartCategory, { slugFn: (d) => slugify((d.name && d.name.ru) || d.name) });
const partTypes = crud(PartType, { slugFn: (d) => slugify(d.name) });
const synonyms = crud(Synonym);
const cities = crud(City, { slugFn: (d) => slugify((d.name && d.name.uz) || d.name) });

// ---------- E'lonlar moderatsiyasi ----------
// GET /admin/listings?status=pending
const listListings = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Listing.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('partTypeId', 'name slug').populate('sellerId', 'name phone').lean(),
    Listing.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

// PATCH /admin/listings/:id/moderate  { action: 'approve' | 'reject', reason }
const moderateListing = asyncHandler(async (req, res) => {
  const { action, reason } = req.body;
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw ApiError.notFound("E'lon topilmadi");

  if (action === 'approve') {
    listing.status = 'active';
    listing.rejectionReason = '';
  } else if (action === 'reject') {
    listing.status = 'rejected';
    listing.rejectionReason = reason || '';
  } else {
    throw ApiError.badRequest("action: approve | reject");
  }
  await listing.save();

  // Sotuvchiga push bildirishnoma
  if (action === 'approve') {
    notifyUser(listing.sellerId, {
      title: "E'loningiz tasdiqlandi ✅",
      body: listing.title,
      data: { type: 'listing_approved', listingId: String(listing._id) },
    }).catch(() => {});
  } else {
    notifyUser(listing.sellerId, {
      title: "E'loningiz rad etildi",
      body: listing.rejectionReason ? `Sabab: ${listing.rejectionReason}` : listing.title,
      data: { type: 'listing_rejected', listingId: String(listing._id) },
    }).catch(() => {});
  }

  res.json({ listing });
});

// ---------- Foydalanuvchilar ----------
// GET /admin/users?q=&role=
const listUsers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const filter = {};
  if (req.query.q) filter.phone = { $regex: req.query.q.replace(/\D/g, ''), $options: 'i' };
  if (req.query.role) filter.role = req.query.role;
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .select('phone name role sellerProfile blocked createdAt').lean(),
    User.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

// PATCH /admin/users/:id  { role?, verified?, blocked? }
const updateUser = asyncHandler(async (req, res) => {
  const { role, verified, blocked } = req.body;
  const update = {};
  if (role && ['buyer', 'seller', 'admin', 'superadmin'].includes(role)) update.role = role;
  if (verified !== undefined) update['sellerProfile.verified'] = !!verified;
  if (blocked !== undefined) update.blocked = !!blocked;
  const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true })
    .select('phone name role sellerProfile blocked');
  if (!user) throw ApiError.notFound();
  res.json({ user });
});

// ---------- Analitika ----------
// GET /admin/analytics
const analytics = asyncHandler(async (req, res) => {
  const [usersTotal, sellersTotal, byStatus, topCategories] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: { $in: ['seller', 'admin', 'superadmin'] } }),
    Listing.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Listing.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'partcategories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $project: { _id: 0, category: '$category.name', slug: '$category.slug', count: 1 } },
    ]),
  ]);

  const statusMap = byStatus.reduce((acc, x) => ({ ...acc, [x._id]: x.count }), {});
  res.json({
    users: { total: usersTotal, sellers: sellersTotal },
    listings: {
      total: Object.values(statusMap).reduce((a, b) => a + b, 0),
      byStatus: statusMap,
    },
    topCategories,
  });
});

// ---------- Katalog ro'yxatlari (GET) — admin boshqaruvi uchun ----------
// GET /admin/synonyms?q=&page=
const listSynonyms = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const filter = {};
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ canonical: rx }, { aliases: rx }];
  }
  const [items, total] = await Promise.all([
    Synonym.find(filter).sort({ canonical: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Synonym.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

// GET /admin/part-types?categoryId=&q=&page=
const listPartTypes = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const filter = {};
  if (req.query.categoryId) filter.categoryId = req.query.categoryId;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: rx }, { synonyms: rx }];
  }
  const [items, total] = await Promise.all([
    PartType.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit)
      .populate('categoryId', 'name slug').lean(),
    PartType.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

// ---------- Shikoyatlar ----------
// GET /admin/reports?status=&page=
const listReports = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('reporterId', 'name phone')
      .populate({ path: 'listingId', select: 'title status sellerId' })
      .lean(),
    Report.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

// PATCH /admin/reports/:id { action: dismiss | resolve | reject_listing }
const resolveReport = asyncHandler(async (req, res) => {
  const { action } = req.body;
  const report = await Report.findById(req.params.id);
  if (!report) throw ApiError.notFound('Shikoyat topilmadi');

  if (action === 'dismiss') {
    report.status = 'dismissed';
  } else if (action === 'resolve') {
    report.status = 'resolved';
  } else if (action === 'reject_listing') {
    const listing = await Listing.findById(report.listingId);
    if (listing) {
      listing.status = 'rejected';
      listing.rejectionReason = 'Shikoyat asosida rad etildi';
      await listing.save();
      notifyUser(listing.sellerId, {
        title: "E'loningiz rad etildi",
        body: 'Shikoyat asosida',
        data: { type: 'listing_rejected', listingId: String(listing._id) },
      }).catch(() => {});
    }
    report.status = 'resolved';
    report.resolution = 'listing_rejected';
  } else {
    throw ApiError.badRequest('action: dismiss | resolve | reject_listing');
  }
  await report.save();
  res.json({ report });
});

// ---------- Push broadcast ----------
// POST /admin/notifications/broadcast
const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, body, role, data } = req.body;
  if (!title || !body) throw ApiError.badRequest('title va body majburiy');

  const filter = { pushTokens: { $exists: true, $not: { $size: 0 } }, blocked: { $ne: true } };
  if (role && role !== 'all') filter.role = role;

  const users = await User.find(filter).select('pushTokens').lean();
  const tokens = users.flatMap((u) => u.pushTokens || []);

  if (tokens.length === 0) return res.json({ sent: 0 });

  await sendPush(tokens, { title, body, data: data || { type: 'broadcast' } });
  res.json({ sent: tokens.length, users: users.length });
});

module.exports = {
  brands, models, generations, engines, categories, partTypes, synonyms, cities,
  listListings, moderateListing, listUsers, updateUser, analytics,
  listSynonyms, listPartTypes,
  listReports, resolveReport,
  broadcastNotification,
};
