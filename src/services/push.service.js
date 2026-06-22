const { User } = require('../models');

// Expo Push API orqali bildirishnoma yuborish (https://exp.host)
async function sendPush(tokens, { title, body, data }) {
  const valid = (tokens || []).filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'));
  if (valid.length === 0) return;
  const messages = valid.map((to) => ({ to, title, body, data: data || {}, sound: 'default' }));
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
    } catch (e) {
      console.error('[push] yuborish xatosi:', e.message);
    }
  }
}

// Foydalanuvchiga (id bo'yicha) bildirishnoma yuborish
async function notifyUser(userId, payload) {
  if (!userId) return;
  const user = await User.findById(userId).select('pushTokens').lean();
  if (user && Array.isArray(user.pushTokens) && user.pushTokens.length) {
    await sendPush(user.pushTokens, payload);
  }
}

module.exports = { sendPush, notifyUser };
