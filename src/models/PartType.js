const mongoose = require('mongoose');

const partTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },        // ruscha (qidiruv kaliti)
    nameUz: { type: String },
    nameEn: { type: String },
    slug: { type: String, required: true, unique: true, index: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PartCategory',
      required: true,
      index: true,
    },
    subcategory: { type: String, default: null },
    synonyms: { type: [String], default: [] },
  },
  { timestamps: true }
);

partTypeSchema.index({ name: 'text', synonyms: 'text' });

module.exports = mongoose.model('PartType', partTypeSchema);
