const mongoose = require('mongoose');

const carModelSchema = new mongoose.Schema(
  {
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    popular: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// slug brend ichida unikal
carModelSchema.index({ brandId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('CarModel', carModelSchema);
