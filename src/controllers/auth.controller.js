const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { User, Otp } = require('../models');
const { normalizePhone, isValidUzPhone } = require('../utils/phone');
const { generateOtp, sha256, hashPassword, verifyPassword } = require('../utils/crypto');
const { signAccess, signRefresh, verifyRefresh } = require('../utils/jwt');
const smsService = require('../services/sms.service');
const env = require('../config/env');

const OTP_TTL_MS = 5 * 60 * 1000;     // 5 daqiqa
const MAX_ATTEMPTS = 5;

function issueTokens(user) {
  const payload = { sub: user._id.toString(), role: user.role, phone: user.phone };
  return { accessToken: signAccess(payload), refreshToken: signRefresh(payload) };
}

function publicUser(u) {
  return {
    _id: u._id, // mobil ilova _id kutadi
    id: u._id, // eski mijozlar (admin/frontend) uchun moslik
    phone: u.phone,
    name: u.name,
    role: u.role,
    sellerProfile: u.sellerProfile,
  };
}

// POST /auth/send-otp
const sendOtp = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (!isValidUzPhone(phone)) throw ApiError.badRequest("Telefon raqami noto'g'ri (+998XXXXXXXXX)");

  const code = generateOtp();
  await Otp.findOneAndUpdate(
    { phone },
    { phone, codeHash: sha256(code), attempts: 0, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    { upsert: true, new: true }
  );

  const result = await smsService.sendOtp(phone, code);

  res.json({
    ok: true,
    message: 'Kod yuborildi',
    // DEV rejimda kodni qaytaramiz (test qulayligi uchun)
    ...(result && result.dev && env.isDev ? { devCode: code } : {}),
  });
});

// POST /auth/verify-otp
const verifyOtp = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const { code } = req.body;

  const otp = await Otp.findOne({ phone });
  if (!otp) throw ApiError.badRequest('Kod topilmadi yoki muddati tugagan. Qayta yuboring.');
  if (otp.attempts >= MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: otp._id });
    throw ApiError.badRequest("Juda ko'p urinish. Qayta kod oling.");
  }
  if (otp.codeHash !== sha256(code)) {
    otp.attempts += 1;
    await otp.save();
    throw ApiError.badRequest("Kod noto'g'ri");
  }

  await Otp.deleteOne({ _id: otp._id });

  let user = await User.findOne({ phone });
  if (!user) user = await User.create({ phone });
  if (user.blocked) throw ApiError.forbidden('Hisob bloklangan');

  const tokens = issueTokens(user);
  await User.updateOne({ _id: user._id }, { $push: { refreshTokens: sha256(tokens.refreshToken) } });

  res.json({ user: publicUser(user), ...tokens });
});

// POST /auth/register  (telefon + parol)
const register = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (!isValidUzPhone(phone)) throw ApiError.badRequest("Telefon raqami noto'g'ri (+998XXXXXXXXX)");
  const { password, name } = req.body;

  const existing = await User.findOne({ phone });
  if (existing) throw ApiError.badRequest("Bu raqam allaqachon ro'yxatdan o'tgan. Kiring.");

  const user = await User.create({
    phone,
    name: name || '',
    passwordHash: hashPassword(password),
  });

  const tokens = issueTokens(user);
  await User.updateOne({ _id: user._id }, { $push: { refreshTokens: sha256(tokens.refreshToken) } });
  res.status(201).json({ user: publicUser(user), ...tokens });
});

// POST /auth/login  (telefon + parol)
const login = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const { password } = req.body;

  const user = await User.findOne({ phone }).select('+passwordHash');
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw ApiError.badRequest("Telefon yoki parol noto'g'ri");
  }
  if (user.blocked) throw ApiError.forbidden('Hisob bloklangan');

  const tokens = issueTokens(user);
  await User.updateOne({ _id: user._id }, { $push: { refreshTokens: sha256(tokens.refreshToken) } });
  res.json({ user: publicUser(user), ...tokens });
});

// POST /auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  let payload;
  try {
    payload = verifyRefresh(refreshToken);
  } catch {
    throw ApiError.unauthorized('Refresh token yaroqsiz');
  }

  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user) throw ApiError.unauthorized();
  const hash = sha256(refreshToken);
  if (!user.refreshTokens.includes(hash)) throw ApiError.unauthorized('Token bekor qilingan');

  // rotatsiya: eskisini olib tashlab, yangisini qo'shamiz
  const tokens = issueTokens(user);
  user.refreshTokens = user.refreshTokens.filter((t) => t !== hash);
  user.refreshTokens.push(sha256(tokens.refreshToken));
  await user.save();

  res.json(tokens);
});

// POST /auth/logout
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await User.updateOne(
      { _id: req.user.id },
      { $pull: { refreshTokens: sha256(refreshToken) } }
    );
  }
  res.json({ ok: true });
});

// GET /auth/me
const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');
  res.json({ user: publicUser(user) });
});

// PATCH /auth/me
const updateProfile = asyncHandler(async (req, res) => {
  const { name, shopName, city, avatar } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (shopName !== undefined) update['sellerProfile.shopName'] = shopName;
  if (city !== undefined) update['sellerProfile.city'] = city;
  if (avatar !== undefined) update['sellerProfile.avatar'] = avatar;

  const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true });
  res.json({ user: publicUser(user) });
});

module.exports = { sendOtp, verifyOtp, register, login, refresh, logout, me, updateProfile };
