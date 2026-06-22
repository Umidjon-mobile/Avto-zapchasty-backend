const rateLimit = require('express-rate-limit');

// OTP yuborish: 1 daqiqada 3 marta
const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Juda ko\'p urinish. Bir daqiqadan keyin qayta urinib ko\'ring.' },
});

// Umumiy API limiti
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'So\'rovlar soni oshib ketdi.' },
});

module.exports = { otpLimiter, apiLimiter };
