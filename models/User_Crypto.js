const mongoose = require('mongoose');

const userCryptoSchema = new mongoose.Schema({
  crypto: String,
  address: String,
  balance: Number,
  delimiterStart: String,
  delimiterEnd: String
});

module.exports = mongoose.model('UserCrypto', userCryptoSchema);
