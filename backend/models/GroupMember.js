const mongoose = require('mongoose');

const GroupMemberSchema = new mongoose.Schema({
  group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  phone: { type: String, required: true }, // Indexed for performance
  is_opted_out: { type: Boolean, default: false },
  daily_sent_count: { type: Number, default: 0 },
  last_sent_date: { type: Date },
  joined_at: { type: Date, default: Date.now }
});

// Composite index for uniqueness within group and fast lookups
GroupMemberSchema.index({ group_id: 1, phone: 1 }, { unique: true });
GroupMemberSchema.index({ phone: 1 });

module.exports = mongoose.model('GroupMember', GroupMemberSchema);
