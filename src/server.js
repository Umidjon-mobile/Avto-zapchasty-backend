const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const { initRealtime } = require('./realtime');
const { Listing } = require('./models');
const { AUTO_ACTIVATE_MS } = require('./services/listing.service');
const { notifyUser } = require('./services/push.service');

// Server restart bo'lganda: allaqachon o'tib ketgan pending listinglarni faollashtirish
// va hali vaqti kelmagan pending listinglar uchun setTimeout qayta rejalashtirish
async function rescheduleAutoActivations() {
  const now = new Date();

  // 1) O'tib ketgan pending listinglarni darhol faollashtirish
  const overdue = await Listing.find({
    status: 'pending',
    scheduledActivateAt: { $lte: now },
  }).select('_id sellerId title').lean();

  if (overdue.length > 0) {
    await Listing.updateMany(
      { _id: { $in: overdue.map((l) => l._id) } },
      { $set: { status: 'active' } }
    );
    console.log(`[startup] ${overdue.length} ta e'lon avtomatik faollashtirildi`);
  }

  // 2) Hali vaqti kelmagan pending listinglar uchun setTimeout qayta o'rnatish
  const upcoming = await Listing.find({
    status: 'pending',
    scheduledActivateAt: { $gt: now },
  }).select('_id sellerId title scheduledActivateAt').lean();

  for (const l of upcoming) {
    const delay = new Date(l.scheduledActivateAt).getTime() - Date.now();
    setTimeout(async () => {
      try {
        const listing = await Listing.findById(l._id);
        if (listing && listing.status === 'pending') {
          listing.status = 'active';
          await listing.save();
          notifyUser(l.sellerId, {
            title: "E'loningiz faollashtirildi ✅",
            body: l.title,
            data: { type: 'listing_approved', listingId: String(l._id) },
          }).catch(() => {});
        }
      } catch (e) {
        console.error('[auto-activate] Xatolik:', e.message);
      }
    }, Math.max(delay, 0));
  }

  if (upcoming.length > 0) {
    console.log(`[startup] ${upcoming.length} ta e'lon uchun auto-activate rejalashtirildi`);
  }
}

(async () => {
  try {
    await connectDB();
    await rescheduleAutoActivations();

    const server = http.createServer(app);
    const io = initRealtime(server);
    app.set('io', io); // controllerlar req.app.get('io') orqali emit qiladi

    server.listen(env.port, () => {
      console.log(`🚀 AvtoEhtiyot API: http://localhost:${env.port}`);
      console.log(`   Rejim: ${env.nodeEnv}`);
      console.log(`   Socket.io: faol (chat)`);
    });
  } catch (err) {
    console.error('❌ Server ishga tushmadi:', err.message);
    process.exit(1);
  }
})();
