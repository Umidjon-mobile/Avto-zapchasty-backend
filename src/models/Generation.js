const mongoose = require('mongoose');

const generationSchema = new mongoose.Schema(
  {
    modelId: { type: mongoose.Schema.Types.ObjectId, ref: 'CarModel', required: true, index: true },
    name: { type: String, required: true },      // "XV70", "70 kuzov"
    yearFrom: { type: Number },
    yearTo: { type: Number },
    bodyType: { type: String, default: '' },     // sedan, hatchback, suv...
    image: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Generation', generationSchema);
