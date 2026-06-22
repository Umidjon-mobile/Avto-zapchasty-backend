const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, default: '', select: false }, // scrypt "salt:hash"
    name: { type: String, default: '' },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'admin', 'superadmin'],
      default: 'buyer',
      index: true,
    },
    sellerProfile: {
      shopName: { type: String, default: '' },
      city: { type: String, default: '' },
      rating: { type: Number, default: 0 },
      verified: { type: Boolean, default: false },
      avatar: { type: String, default: '' },
    },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
    pushTokens: { type: [String], default: [] }, // Expo push tokenlari
    refreshTokens: { type: [String], default: [], select: false }, // sha256 hash
    blocked: { type: Boolean, default: false },
    lastSeen: { type: Date }, // oxirgi faollik vaqti (chat presence uchun)
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
