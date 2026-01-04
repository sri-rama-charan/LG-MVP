const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  content: { type: String, required: true },
  status: { type: String, enum: ['DRAFT', 'PROCESSING', 'COMPLETED', 'FAILED', 'SCHEDULED'], default: 'DRAFT' },
  selected_group_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  budget_max: { type: Number },
  estimated_cost: { type: Number }, // Estimated cost in cents/paisa
  cost_per_msg: { type: Number, default: 5 }, // Example: 5 cents
  scheduled_at: { type: Date }, // When to start the campaign
  stats: {
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    read: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  },
  created_at: { type: Date, default: Date.now },
  completed_at: Date
});

module.exports = mongoose.model('Campaign', CampaignSchema);
