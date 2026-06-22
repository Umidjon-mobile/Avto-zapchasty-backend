const asyncHandler = require('../utils/asyncHandler');
const { notifyUser } = require('../services/push.service');
const ApiError = require('../utils/ApiError');
const { Listing, User, ListingView } = require('../models');
const listingService = require('../services/listing.service');
const searchService = require('../services/search.service');

// GET /listings  (qidiruv + filtr)
const list = asyncHandler(async (req, res) => {
  const result = await searchService.searchListings(req.query);
  res.json(result);
});

// GET /listings/:id
const getOne = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id)
    .populate('partTypeId', 'name slug')
    .populate('categoryId', 'name slug')
    .populate('sellerId', 'name sellerProfile phone')
    .populate('fitment.brandId', 'name slug')
    .populate('fitment.modelId', 'name slug')
    .populate('fitment.generationId', 'name')
    .populate('fitment.engineId', 'name fuelType')
    .lean();
  if (!listing) throw ApiError.notFound("E'lon topilmadi");

  // ko'rishlar sonini oshirish (faol e'lon uchun) — UNIQUE ko'rish
  // Sotuvchi o'z e'lonini ko'rsa hisoblanmaydi; bir viewer 24 soatda 1 marta.
  if (listing.status === 'active') {
    const isOwner = req.user && listing.sellerId.toString() === req.user.id;
    if (!isOwner) {
      const viewer = req.user
        ? `u:${req.user.id}`
        : `ip:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;
      // Yangi (e'lon, viewer) yozuvini yaratishga urinamiz.
      // Allaqachon mavjud bo'lsa (oyna ichida) -> duplicate xato -> views oshmaydi.
      ListingView.create({ listingId: listing._id, viewer })
        .then(() => Listing.updateOne({ _id: listing._id }, { $inc: { views: 1 } }))
        .catch(() => {}); // duplicate yoki boshqa xato -> jim o'tkazamiz
    }
  }

  // foydalanuvchi sevimliga qo'shganmi?
  let isFavorite = false;
  if (req.user) {
    const u = await User.findById(req.user.id).select('favorites').lean();
    isFavorite = !!u && u.favorites.some((f) => f.toString() === listing._id.toString());
  }

  res.json({ listing, isFavorite });
});

// POST /listings  (sotuvchi)
const create = asyncHandler(async (req, res) => {
  // buyer birinchi e'lon bersa, seller ga ko'tariladi
  await User.updateOne({ _id: req.user.id, role: 'buyer' }, { $set: { role: 'seller' } });

  const listing = await listingService.createListing(req.user.id, req.body);
  res.status(201).json({ listing });
});

// PATCH /listings/:id
const update = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw ApiError.notFound("E'lon topilmadi");
  const isOwner = listing.sellerId.toString() === req.user.id;
  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  if (!isOwner && !isAdmin) throw ApiError.forbidden();

  const updated = await listingService.updateListing(listing, req.body);
  res.json({ listing: updated });
});

// DELETE /listings/:id
const remove = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw ApiError.notFound("E'lon topilmadi");
  const isOwner = listing.sellerId.toString() === req.user.id;
  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  if (!isOwner && !isAdmin) throw ApiError.forbidden();

  await listing.deleteOne();
  res.json({ ok: true });
});

// PATCH /listings/:id/status  (sotuvchi: sotildi / arxiv)
const setStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['sold', 'archived', 'active'].includes(status)) {
    throw ApiError.badRequest("status: sold | archived | active");
  }
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw ApiError.notFound("E'lon topilmadi");
  if (listing.sellerId.toString() !== req.user.id) throw ApiError.forbidden();
  // active ga qaytarsa, qayta moderatsiya
  listing.status = status === 'active' ? 'pending' : status;
  await listing.save();
  res.json({ listing });
});

// GET /listings/my
const myListings = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const filter = { sellerId: req.user.id };
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Listing.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('partTypeId', 'name slug').lean(),
    Listing.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

// POST /listings/:id/favorite  (toggle)
const toggleFavorite = asyncHandler(async (req, res) => {
  const listingId = req.params.id;
  const listing = await Listing.findById(listingId).select('_id sellerId title');
  if (!listing) throw ApiError.notFound("E'lon topilmadi");

  const user = await User.findById(req.user.id).select('favorites');
  const idx = user.favorites.findIndex((f) => f.toString() === listingId);
  let isFavorite;
  if (idx >= 0) {
    user.favorites.splice(idx, 1);
    isFavorite = false;
    await Listing.updateOne({ _id: listingId }, { $inc: { favoritesCount: -1 } });
  } else {
    user.favorites.push(listingId);
    isFavorite = true;
    await Listing.updateOne({ _id: listingId }, { $inc: { favoritesCount: 1 } });
    if (listing.sellerId && listing.sellerId.toString() !== req.user.id) {
      notifyUser(listing.sellerId, {
        title: "E'loningiz saqlandi ⭐",
        body: listing.title,
        data: { type: 'favorite', listingId: String(listing._id) },
      }).catch(() => {});
    }
  }
  await user.save();
  res.json({ isFavorite });
});

// GET /listings/favorites/list
const getFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('favorites').lean();
  const items = await Listing.find({ _id: { $in: user.favorites }, status: 'active' })
    .populate('partTypeId', 'name slug').sort({ createdAt: -1 }).lean();
  res.json({ items });
});

module.exports = {
  list, getOne, create, update, remove, setStatus,
  myListings, toggleFavorite, getFavorites,
};
