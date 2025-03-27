const userCryptoSchema = new mongoose.Schema({
  crypto: { type: String, required: true },
  address: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  delimiterStart: { type: String }, // plus required
  delimiterEnd: { type: String }    // plus required
}, { timestamps: true });
