const { Server } = require('socket.io');
const { verifyAccess } = require('./utils/jwt');
const { User } = require('./models');

// userId -> ochiq socket ulanishlar soni (onlayn holatni aniqlash uchun)
const onlineCounts = new Map();

function isUserOnline(userId) {
  return (onlineCounts.get(String(userId)) || 0) > 0;
}

async function touchLastSeen(userId) {
  try {
    await User.updateOne({ _id: userId }, { $set: { lastSeen: new Date() } });
  } catch {
    /* lastSeen yangilanmasa ham xizmat to'xtamaydi */
  }
}

function initRealtime(httpServer) {
  const io = new Server(httpServer, { cors: { origin: '*' } });

  // JWT autentifikatsiya (handshake.auth.token)
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      const p = verifyAccess(token);
      socket.userId = p.sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const uid = String(socket.userId);
    // Shaxsiy xona — bildirishnomalar va inbox yangilanishlari uchun
    socket.join(`user:${uid}`);

    // Onlayn holatni belgilash
    const prev = onlineCounts.get(uid) || 0;
    onlineCounts.set(uid, prev + 1);
    if (prev === 0) {
      touchLastSeen(uid);
      io.emit('presence:update', { userId: uid, online: true });
    }

    // Suhbatni ochish/yopish (real-time xabar uchun)
    socket.on('conversation:open', (conversationId) => {
      if (conversationId) socket.join(`conv:${conversationId}`);
    });
    socket.on('conversation:leave', (conversationId) => {
      if (conversationId) socket.leave(`conv:${conversationId}`);
    });

    socket.on('disconnect', () => {
      const cur = (onlineCounts.get(uid) || 1) - 1;
      if (cur <= 0) {
        onlineCounts.delete(uid);
        touchLastSeen(uid);
        io.emit('presence:update', { userId: uid, online: false, lastSeen: new Date() });
      } else {
        onlineCounts.set(uid, cur);
      }
    });
  });

  return io;
}

module.exports = { initRealtime, isUserOnline };
