const mongoose = require('mongoose');

const cryptoSchema = new mongoose.Schema({
  name: String,
  symbol: String,
  priceUSD: Number,
  priceEUR: Number,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Crypto', cryptoSchema);
