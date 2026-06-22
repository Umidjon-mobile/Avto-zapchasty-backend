const mongoose = require('mongoose');

// Unique ko'rishlarni dedup qilish uchun.
// viewer = ro'yxatdan o'tgan bo'lsa userId, bo'lmasa IP manzili.
// TTL: yozuv 24 soatdan keyin o'chadi -> bir viewer 24 soatda 1 marta hisoblanadi.
const VIEW_WINDOW_SECONDS = 24 * 60 * 60;

const listingViewSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    viewer: { type: String, required: true }, // "u:<userId>" yoki "ip:<ip>"
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Bitta viewer + bitta e'lon = bitta yozuv (oyna ichida)
listingViewSchema.index({ listingId: 1, viewer: 1 }, { unique: true });
// TTL: oyna tugagach yozuv o'chadi, qayta ko'rish yana hisoblanadi
listingViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: VIEW_WINDOW_SECONDS });

module.exports = mongoose.model('ListingView', listingViewSchema);
module.exports.VIEW_WINDOW_SECONDS = VIEW_WINDOW_SECONDS;
