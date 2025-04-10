const mongoose = require('mongoose');

const userCryptoSchema = new mongoose.Schema({
  crypto: { type: String, required: true },
  address: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  delimiterStart: { type: String, required: false },
  delimiterEnd: { type: String, required: false },
  cssSelector: { type: String, required: false } // <-- ✅ AJOUT ICI
}, { timestamps: true });

module.exports = mongoose.model('UserCrypto', userCryptoSchema);

