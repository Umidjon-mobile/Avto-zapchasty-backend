const { z } = require('zod');

const sendOtp = z.object({
  phone: z.string().min(7, 'Telefon raqami noto\'g\'ri'),
});

const verifyOtp = z.object({
  phone: z.string().min(7),
  code: z.string().regex(/^\d{6}$/, '6 xonali kod kiriting'),
});

const register = z.object({
  phone: z.string().min(7, 'Telefon raqami noto\'g\'ri'),
  password: z.string().min(4, 'Parol kamida 4 ta belgi'),
  name: z.string().max(120).optional(),
});

const login = z.object({
  phone: z.string().min(7, 'Telefon raqami noto\'g\'ri'),
  password: z.string().min(1, 'Parol kiriting'),
});

const refresh = z.object({
  refreshToken: z.string().min(10),
});

const updateProfile = z.object({
  name: z.string().max(120).optional(),
  shopName: z.string().max(120).optional(),
  city: z.string().max(80).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
});

module.exports = { sendOtp, verifyOtp, register, login, refresh, updateProfile };
