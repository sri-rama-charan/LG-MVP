const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
  amount: { type: Number, required: true },
  reference_id: { type: String }, // Can refer to Campaign ID or Deposit ID
  description: String,
  metadata: { type: Map, of: String }, // Store { group_name, group_id } etc.
  timestamp: { type: Date, default: Date.now }
});

const WalletSchema = new mongoose.Schema({
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, default: 0 }, // In cents/paisa
  currency: { type: String, default: 'INR' },
  transactions: [TransactionSchema]
});

module.exports = mongoose.model('Wallet', WalletSchema);
