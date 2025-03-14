const mongoose = require('mongoose');

const userCryptoSchema = new mongoose.Schema({
  crypto: { type: String, required: true },
  address: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  delimiterStart: { type: String, required: true },
  delimiterEnd: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('UserCrypto', userCryptoSchema);
