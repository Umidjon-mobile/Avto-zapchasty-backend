const mongoose = require('mongoose');

const partCategorySchema = new mongoose.Schema(
  {
    name: {
      ru: { type: String, required: true },
      uz: { type: String },
      en: { type: String },
    },
    slug: { type: String, required: true, unique: true, index: true },
    icon: { type: String, default: 'package' },
    order: { type: Number, default: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PartCategory', partCategorySchema);
