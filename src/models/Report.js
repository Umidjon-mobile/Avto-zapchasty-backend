const mongoose = require('mongoose');

const REASONS = ['spam', 'fraud', 'prohibited', 'wrong_category', 'duplicate', 'offensive', 'other'];

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', index: true },
    reason: { type: String, enum: REASONS, required: true },
    comment: { type: String, default: '', maxlength: 1000 },
    status: { type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open', index: true },
    resolution: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
module.exports.REASONS = REASONS;
