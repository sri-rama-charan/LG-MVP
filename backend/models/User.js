const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'GROUP_ADMIN', 'BRAND'], default: 'GROUP_ADMIN' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
