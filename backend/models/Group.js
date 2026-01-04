const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  daily_cap_per_member: { type: Number, default: 1 },
  member_count: { type: Number, default: 0 },
  approx_member_count: { type: Number },
  price_per_message: { type: Number, default: 5 }, // In cents/paisa
  tags: {
    city: String,
    state: String,
    language: String,
    interest: String,
    profession: String,
    income_band: String
  },
  monetization_enabled: { type: Boolean, default: false },
  consent_declared: { type: Boolean, default: false }, // Logged self-declaration
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Group', GroupSchema);
