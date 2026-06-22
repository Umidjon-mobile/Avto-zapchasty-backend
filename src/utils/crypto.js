const crypto = require('crypto');

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const sha256 = (text) => crypto.createHash('sha256').update(String(text)).digest('hex');
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeOem = (s) => String(s).replace(/[^a-z0-9]/gi, '').toUpperCase();

// Parol hash (scrypt — qo'shimcha paketsiz, xavfsiz). Format: "salt:hash"
const hashPassword = (plain) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(plain), salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (plain, stored) => {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(plain), salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(test, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = { generateOtp, sha256, escapeRegex, normalizeOem, hashPassword, verifyPassword };
