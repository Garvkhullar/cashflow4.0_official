const mongoose = require('mongoose');

const chanceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String },
});

module.exports = mongoose.model('Chance', chanceSchema);