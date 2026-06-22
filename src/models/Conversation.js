const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
    lastMessage: {
      text: { type: String, default: '' },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: { type: Date },
    },
    unread: { type: Map, of: Number, default: {} }, // userId -> o'qilmagan soni
  },
  { timestamps: true }
);
conversationSchema.index({ participants: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
