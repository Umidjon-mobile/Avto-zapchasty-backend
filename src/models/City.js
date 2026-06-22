const mongoose = require('mongoose');

const citySchema = new mongoose.Schema(
  {
    name: {
      uz: { type: String, required: true },
      ru: { type: String },
    },
    slug: { type: String, required: true, unique: true, index: true },
    region: { type: String, default: '' },
    order: { type: Number, default: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('City', citySchema);
