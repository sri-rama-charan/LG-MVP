const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'GROUP_ADMIN', 'BRAND'], default: 'GROUP_ADMIN' },
  is_verified: { type: Boolean, default: false },
  otp: { type: String },
  otp_expires: { type: Date },
  subscription: {
    plan_id: { type: String, enum: ['MONTHLY', 'SIX_MONTH', 'YEARLY', 'NONE'], default: 'NONE' },
    active: { type: Boolean, default: false },
    expires_at: { type: Date }
  },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
