const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    logo: { type: String, default: '' },
    country: { type: String, default: '' },
    popular: { type: Boolean, default: false },
    order: { type: Number, default: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Brand', brandSchema);
