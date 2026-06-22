const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    // TTL: expiresAt o'tganda hujjat avtomatik o'chadi
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
