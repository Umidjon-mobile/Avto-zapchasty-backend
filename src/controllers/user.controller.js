const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { User, Listing } = require('../models');

// GET /users/:id/profile  (ochiq sotuvchi profili)
const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('name sellerProfile createdAt').lean();
  if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');
  const activeCount = await Listing.countDocuments({ sellerId: req.params.id, status: 'active' });
  res.json({ profile: { ...user, activeListings: activeCount } });
});

// POST /users/push-token  (auth) — Expo push tokenni ro'yxatdan o'tkazish
const registerPushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') throw ApiError.badRequest('token majburiy');
  await User.updateOne({ _id: req.user.id }, { $addToSet: { pushTokens: token } });
  res.json({ ok: true });
});

// DELETE /users/push-token  (auth) — tokenni o'chirish (logout)
const removePushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw ApiError.badRequest('token majburiy');
  await User.updateOne({ _id: req.user.id }, { $pull: { pushTokens: token } });
  res.json({ ok: true });
});

module.exports = { getPublicProfile, registerPushToken, removePushToken };
