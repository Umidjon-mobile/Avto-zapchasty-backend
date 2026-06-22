const mongoose = require('mongoose');

const synonymSchema = new mongoose.Schema(
  {
    canonical: { type: String, required: true, unique: true, index: true },
    aliases: { type: [String], default: [] },
    ambiguous: { type: Boolean, default: false },
    note: { type: String },
    partTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'PartType', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Synonym', synonymSchema);
