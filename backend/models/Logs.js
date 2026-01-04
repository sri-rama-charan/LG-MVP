const mongoose = require('mongoose');

const MessageLogSchema = new mongoose.Schema({
  campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  phone: { type: String, required: true },
  group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, // Attribution
  status: { type: String, enum: ['QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'], default: 'QUEUED' },
  message_id: { type: String }, // BSP ID
  cost: { type: Number },
  is_paid: { type: Boolean, default: false }, // Revenue split processed?
  created_at: { type: Date, default: Date.now },
  updated_at: Date
});

const OptOutSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = {
  MessageLog: mongoose.model('MessageLog', MessageLogSchema),
  OptOut: mongoose.model('OptOut', OptOutSchema)
};
