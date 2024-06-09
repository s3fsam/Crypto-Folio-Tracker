const mongoose = require('mongoose');

const cryptoSchema = new mongoose.Schema({
  id: String,
  name: String,
  symbol: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('cryptolists', cryptoSchema);
