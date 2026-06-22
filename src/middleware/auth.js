const ApiError = require('../utils/ApiError');
const { verifyAccess } = require('../utils/jwt');

function extractToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

// Majburiy auth
function auth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized());
  try {
    const p = verifyAccess(token);
    req.user = { id: p.sub, role: p.role, phone: p.phone };
    next();
  } catch {
    next(ApiError.unauthorized('Token yaroqsiz yoki muddati tugagan'));
  }
}

// Ixtiyoriy auth — token bo'lmasa ham o'tadi (masalan, e'lon ko'rish)
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const p = verifyAccess(token);
    req.user = { id: p.sub, role: p.role, phone: p.phone };
  } catch {
    /* token yaroqsiz bo'lsa, mehmon sifatida davom etamiz */
  }
  next();
}

module.exports = { auth, optionalAuth };
