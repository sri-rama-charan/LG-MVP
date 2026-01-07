const Campaign = require('../models/Campaign');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
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
    
    // Check User Subscription
    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'BRAND' && (!user.subscription || !user.subscription.active)) {
        return res.status(403).json({ error: 'Subscription Required. Please upgrade your plan.' });
    }

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
    // Get weighted average cost per message
    const groups = await Group.find({ _id: { $in: selected_group_ids } });
    const totalMembers = groups.reduce((sum, g) => sum + (g.member_count || 0), 0);
    
    // We already have estimatedCost (Total Cost). 
    // Weighted Avg = Total Cost / Total Members
    const avgCostPerMsg = totalMembers > 0 
      ? Math.round(estimatedCost / totalMembers) 
      : (groups.length > 0 ? groups[0].price_per_message : 5);
    
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

    // Check User Subscription for Launching as well
    const user = await User.findById(campaign.brand_id);
    if (user.role === 'BRAND' && (!user.subscription || !user.subscription.active)) {
         return res.status(403).json({ error: 'Active Subscription Required to launch campaigns.' });
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

// Add groups to an existing campaign
exports.addGroups = async (req, res) => {
    try {
        const { id } = req.params;
        const { group_ids, user_id } = req.body;

        const campaign = await Campaign.findById(id);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        if (campaign.brand_id.toString() !== user_id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
            return res.status(400).json({ error: 'Can only add groups to DRAFT or SCHEDULED campaigns' });
        }

        // Filter out already selected groups to avoid duplicates in list
        const newGroupIds = group_ids.filter(gid => !campaign.selected_group_ids.includes(gid));
        
        if (newGroupIds.length === 0) {
            return res.json({ message: 'No new groups to add', campaign });
        }
        
        // Merge IDs
        const allGroupIds = [...campaign.selected_group_ids, ...newGroupIds];

        // Recalculate TOTAL cost from scratch for all groups
        // This ensures self-healing if previous calc was wrong
        const totalEstimatedCost = await calculateEstimatedCost(allGroupIds);

        // Check wallet against NEW total if budget set
        if (campaign.budget_max) {
             const wallet = await Wallet.findOne({ owner_id: user_id });
             if (wallet.balance < totalEstimatedCost) {
                 // warning logic or block
             }
        }

        // Update Campaign
        campaign.selected_group_ids = allGroupIds; // Update list
        campaign.estimated_cost = totalEstimatedCost;
        
        // Recalculate Weighted Average Cost per Message
        // Weighted Avg = Total Estimated Cost / Total Members
        // We know Total Cost. We need Total Members.
        // Re-fetch groups to get details
        const groups = await Group.find({ _id: { $in: allGroupIds } });
        
        // We need accurate member count (sum of GroupMember counts, or approximate from Group.member_count)
        // Group.member_count is maintained by addMembers, so it should be fast and reasonably accurate.
        // Or we can sum up unit costs: (Cost / Members).
        
        let totalMembers = 0;
        // Ideally fetch exact counts again if we want precision, but Group.member_count is standard
        totalMembers = groups.reduce((sum, g) => sum + (g.member_count || 0), 0);
        
        if (totalMembers > 0) {
            campaign.cost_per_msg = Math.round(totalEstimatedCost / totalMembers); // Weighted Average
        } else {
             // Fallback/Default if 0 members
            campaign.cost_per_msg = 5; 
        }

        await campaign.save();
        
        res.json(campaign);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.removeGroup = async (req, res) => {
    try {
        const { id, groupId } = req.params;
        const { user_id } = req.body; 

        const campaign = await Campaign.findById(id);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        if (campaign.brand_id.toString() !== user_id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
            return res.status(400).json({ error: 'Can only remove groups from DRAFT or SCHEDULED campaigns' });
        }

        // Filter out the group to remove
        const newGroupIds = campaign.selected_group_ids.filter(gid => gid.toString() !== groupId);

        if (newGroupIds.length === campaign.selected_group_ids.length) {
            return res.status(404).json({ error: 'Group not found in campaign' });
        }

        // Recalculate TOTAL cost
        const totalEstimatedCost = await calculateEstimatedCost(newGroupIds);

        // Update Campaign
        campaign.selected_group_ids = newGroupIds;
        campaign.estimated_cost = totalEstimatedCost;
        
        // Recalculate Weighted Average Cost per Message
        const groups = await Group.find({ _id: { $in: newGroupIds } });
        const totalMembers = groups.reduce((sum, g) => sum + (g.member_count || 0), 0);
        
        if (totalMembers > 0) {
            campaign.cost_per_msg = Math.round(totalEstimatedCost / totalMembers);
        } else {
            campaign.cost_per_msg = 5; // Default
        }

        await campaign.save();
        
        res.json(campaign);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body; // Get user_id from body or query
        
        const campaign = await Campaign.findById(id);
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Verify ownership
        if (campaign.brand_id.toString() !== user_id) {
            return res.status(403).json({ error: 'Unauthorized to delete this campaign' });
        }

        // Only allow deletion of DRAFT, FAILED, or SCHEDULED campaigns
        // Don't allow deletion of PROCESSING or COMPLETED campaigns
        if (['PROCESSING', 'COMPLETED'].includes(campaign.status)) {
            return res.status(400).json({ 
                error: `Cannot delete ${campaign.status} campaigns. Only DRAFT, SCHEDULED, or FAILED campaigns can be deleted.` 
            });
        }

        // Remove any scheduled jobs from queue if campaign is scheduled
        if (campaign.status === 'SCHEDULED' && campaignQueue) {
            try {
                const jobs = await campaignQueue.getJobs(['delayed', 'waiting']);
                for (const job of jobs) {
                    if (job.data.campaignId && job.data.campaignId.toString() === id) {
                        await job.remove();
                    }
                }
            } catch (queueError) {
                console.warn('Could not remove campaign from queue:', queueError.message);
                // Continue with deletion even if queue removal fails
            }
        }

        await Campaign.findByIdAndDelete(id);
        
        res.json({ message: 'Campaign deleted successfully' });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
}
