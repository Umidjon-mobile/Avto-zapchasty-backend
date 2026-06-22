const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Report, Listing } = require('../models');

const REASONS = ['spam', 'fraud', 'prohibited', 'wrong_category', 'duplicate', 'offensive', 'other'];

// POST /reports  (auth) { listingId, reason, comment }
const createReport = asyncHandler(async (req, res) => {
  const { listingId, reason, comment } = req.body;
  if (!listingId) throw ApiError.badRequest('listingId majburiy');
  if (!REASONS.includes(reason)) throw ApiError.badRequest('Sabab noto\'g\'ri');

  const listing = await Listing.findById(listingId).select('_id');
  if (!listing) throw ApiError.notFound("E'lon topilmadi");

  // Bir foydalanuvchidan bitta e'longa ochiq shikoyat takrorlanmasin
  const existing = await Report.findOne({ listingId, reporterId: req.user.id, status: 'open' });
  if (existing) return res.json({ ok: true, duplicate: true });

  await Report.create({ listingId, reporterId: req.user.id, reason, comment: (comment || '').trim() });
  res.status(201).json({ ok: true });
});

module.exports = { createReport };
