const mongoose = require('mongoose');
const { normalizeOem } = require('../utils/crypto');

const fitmentSchema = new mongoose.Schema(
  {
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    modelId: { type: mongoose.Schema.Types.ObjectId, ref: 'CarModel' },
    generationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Generation' },
    engineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Engine' },
  },
  { _id: false }
);

const listingSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    partTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'PartType', required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PartCategory', required: true, index: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    // OEM — universal qidiruv kaliti
    oemNumbers: { type: [String], default: [] },
    oemNormalized: { type: [String], default: [], index: true }, // qidiruv uchun
    vin: { type: String, default: '' },
    article: { type: String, default: '' },

    condition: {
      type: String,
      enum: ['new', 'used', 'contract', 'original', 'duplicate'],
      required: true,
      index: true,
    },
    manufacturer: { type: String, default: '' },

    price: {
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'UZS' },
    },
    negotiable: { type: Boolean, default: false },

    fitment: { type: fitmentSchema, default: () => ({}) },
    compatibleVehicles: { type: [fitmentSchema], default: [] },

    attributes: {
      side: { type: String, enum: ['left', 'right', null], default: null },
      position: { type: String, enum: ['front', 'rear', null], default: null },
    },

    photos: { type: [String], default: [] },
    city: { type: String, default: '', index: true },
    delivery: { type: Boolean, default: false },
    phone: { type: String, default: '' }, // sotuvchi kontakti

    status: {
      type: String,
      enum: ['draft', 'pending', 'active', 'sold', 'rejected', 'archived'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String, default: '' },

    views: { type: Number, default: 0 },
    favoritesCount: { type: Number, default: 0 },

    searchText: { type: String, default: '' }, // service tomonidan to'ldiriladi
    scheduledActivateAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

// Full-text qidiruv (Atlas Search yo'q bo'lsa, native fallback)
listingSchema.index({ searchText: 'text' });
// Tez-tez ishlatiladigan filtrlar
listingSchema.index({ status: 1, categoryId: 1, createdAt: -1 });
listingSchema.index({ 'fitment.brandId': 1, 'fitment.modelId': 1 });

// oemNormalized ni avtomatik hisoblash (oemNumbers o'zgarsa)
listingSchema.pre('save', function (next) {
  if (this.isModified('oemNumbers')) {
    this.oemNormalized = (this.oemNumbers || [])
      .map(normalizeOem)
      .filter(Boolean);
  }
  next();
});

module.exports = mongoose.model('Listing', listingSchema);
