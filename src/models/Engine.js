const mongoose = require('mongoose');

const engineSchema = new mongoose.Schema(
  {
    generationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Generation', required: true, index: true },
    name: { type: String, required: true },      // "2.5 benzin"
    volume: { type: Number },                     // 2.5
    fuelType: {
      type: String,
      enum: ['petrol', 'diesel', 'hybrid', 'electric', 'gas'],
      default: 'petrol',
    },
    power: { type: Number },                       // ot kuchi
  },
  { timestamps: true }
);

module.exports = mongoose.model('Engine', engineSchema);
