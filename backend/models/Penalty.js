const mongoose = require('mongoose');

const penaltySchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String },
});

module.exports = mongoose.model('Penalty', penaltySchema);