const Campaign = require('../models/Campaign');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const Wallet = require('../models/Wallet');
const { campaignQueue } = require('../jobs/queues');
const { isWithinAllowedTimeWindow, getNextAllowedTime } = require('../config/campaignConfig');

// Helper function to calculate estimated cost
async function calculateEstimatedCost(groupIds) {
  if (!groupIds || groupIds.length === 0) return 0;
  
  const groups = await Group.find({ _id: { $in: groupIds }, status: 'ACTIVE' });
  let totalCost = 0;
  
  for (const group of groups) {
    // Get unique member count for this group
    const memberCount = await GroupMember.countDocuments({ 
      group_id: group._id, 
      is_opted_out: false 
    });
    const groupCost = memberCount * group.price_per_message;
    totalCost += groupCost;
  }
  
  return totalCost;
}

exports.createCampaign = async (req, res) => {
  try {
    const { name, description, content, selected_group_ids, scheduled_at, budget_max, user_id } = req.body;
    
    if (!selected_group_ids || selected_group_ids.length === 0) {
      return res.status(400).json({ error: 'At least one group must be selected' });
    }
    
    // Calculate estimated cost
    const estimatedCost = await calculateEstimatedCost(selected_group_ids);
    
    // Validate budget against wallet if budget is specified
    if (budget_max) {
      const wallet = await Wallet.findOne({ owner_id: user_id });
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }
      if (wallet.balance < budget_max) {
        return res.status(400).json({ 
          error: 'Insufficient wallet balance', 
          balance: wallet.balance,
          required: budget_max 
        });
      }
    }
    
    // Handle scheduling and time window validation
    let scheduledDateTime = null;
    let status = 'DRAFT';
    
    if (scheduled_at) {
      scheduledDateTime = new Date(scheduled_at);
      const now = new Date();
      
      if (scheduledDateTime <= now) {
        return res.status(400).json({ error: 'Scheduled time must be in the future' });
      }
      
      // Check if within allowed time window
      if (!isWithinAllowedTimeWindow(scheduledDateTime)) {
        const adjustedTime = getNextAllowedTime(scheduledDateTime);
        scheduledDateTime = adjustedTime;
        // Optionally notify user about adjustment, but for MVP we'll just adjust
      }
      
      status = 'SCHEDULED';
    }
    
    // Get average cost per message from selected groups
    const groups = await Group.find({ _id: { $in: selected_group_ids } });
    const avgCostPerMsg = groups.length > 0 
      ? Math.round(groups.reduce((sum, g) => sum + g.price_per_message, 0) / groups.length)
      : 5;
    
    const campaign = await Campaign.create({
      brand_id: user_id,
      name,
      description,
      content,
      selected_group_ids,
      scheduled_at: scheduledDateTime,
      budget_max: budget_max || estimatedCost, // Use estimated cost if budget not specified
      estimated_cost: estimatedCost,
      cost_per_msg: avgCostPerMsg,
      status
    });
    
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.launchCampaign = async (req, res) => {
  try {
    const { id } = req.params; // Campaign ID
    const campaign = await Campaign.findById(id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
      return res.status(400).json({ error: 'Campaign already processing or done' });
    }

    // Validate wallet balance before launching
    const wallet = await Wallet.findOne({ owner_id: campaign.brand_id });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    const requiredBudget = campaign.budget_max || campaign.estimated_cost || 0;
    if (wallet.balance < requiredBudget) {
      return res.status(400).json({ 
        error: 'Insufficient wallet balance to launch campaign',
        balance: wallet.balance,
        required: requiredBudget
      });
    }

    // Check if scheduled campaign is ready to launch
    if (campaign.scheduled_at) {
      const now = new Date();
      if (campaign.scheduled_at > now) {
        // Campaign is scheduled for future, keep as SCHEDULED
        // In production, you'd have a scheduler check these
        return res.json({ 
          message: 'Campaign scheduled', 
          campaignId: id,
          scheduledAt: campaign.scheduled_at
        });
      }
      
      // Check time window for immediate scheduled campaigns
      if (!isWithinAllowedTimeWindow(now)) {
        const nextWindow = getNextAllowedTime(now);
        return res.status(400).json({ 
          error: 'Cannot launch outside allowed time window',
          nextAllowedTime: nextWindow,
          allowedWindow: '9 AM - 9 PM'
        });
      }
    }

    // Update status and add to queue
    campaign.status = 'PROCESSING';
    await campaign.save();
    
    await campaignQueue.add({ campaignId: campaign._id });

    res.json({ message: 'Campaign launched', campaignId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find({ brand_id: req.query.user_id })
            .populate('selected_group_ids', 'name tags member_count price_per_message');
        res.json(campaigns);
    } catch(err) {
        res.status(500).json({error: err.message});
    }
}

// Estimate cost for a campaign before creating it
exports.estimateCost = async (req, res) => {
    try {
        const { selected_group_ids } = req.query;
        if (!selected_group_ids) {
            return res.status(400).json({ error: 'selected_group_ids required' });
        }
        
        const groupIds = Array.isArray(selected_group_ids) 
            ? selected_group_ids 
            : selected_group_ids.split(',');
        
        const estimatedCost = await calculateEstimatedCost(groupIds);
        
        // Also return group details for display
        const groups = await Group.find({ _id: { $in: groupIds }, status: 'ACTIVE' })
            .select('name member_count price_per_message tags');
        
        res.json({
            estimated_cost: estimatedCost,
            estimated_units: groups.reduce((sum, g) => sum + (g.member_count || 0), 0),
            groups: groups.map(g => ({
                id: g._id,
                name: g.name,
                member_count: g.member_count,
                price_per_message: g.price_per_message,
                group_cost: (g.member_count || 0) * g.price_per_message
            }))
        });
    } catch(err) {
        res.status(500).json({error: err.message});
    }
}
