const env = require('../config/env');

let tokenCache = { token: null, exp: 0 };

async function getToken() {
  if (tokenCache.token && Date.now() < tokenCache.exp) return tokenCache.token;
  const res = await fetch(`${env.eskiz.baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.eskiz.email, password: env.eskiz.password }),
  });
  const data = await res.json();
  const token = data && data.data && data.data.token;
  if (!token) throw new Error('Eskiz token olinmadi');
  tokenCache = { token, exp: Date.now() + 25 * 24 * 3600 * 1000 }; // ~25 kun
  return token;
}

// OTP kodini yuborish
async function sendOtp(phone, code) {
  const message = `AvtoEhtiyot: tasdiqlash kodingiz ${code}`;
  // DEV rejim: Eskiz sozlanmagan bo'lsa, kodni konsolga chiqaramiz
  if (!env.eskiz.email || !env.eskiz.password) {
    console.log(`📲 [DEV SMS] ${phone} -> kod: ${code}`);
    return { dev: true };
  }
  const token = await getToken();
  const form = new URLSearchParams({
    mobile_phone: phone.replace('+', ''),
    message,
    from: env.eskiz.from,
  });
  const res = await fetch(`${env.eskiz.baseUrl}/message/sms/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  return res.json();
}

module.exports = { sendOtp };
