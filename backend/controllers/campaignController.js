const Campaign = require('../models/Campaign');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const { campaignQueue } = require('../jobs/queues');
const { isWithinAllowedTimeWindow, getNextAllowedTime } = require('../config/campaignConfig');

/**
 * Calculates the estimated cost for a SINGLE run of the campaign.
 * Sums up the cost of sending messages to all non-opted-out members in selected groups.
 * 
 * @param {string[]} groupIds - Array of Group IDs selected for the campaign
 * @returns {Promise<number>} Total estimated cost in smallest currency unit (e.g., paise/cents)
 */
async function calculateEstimatedCost(groupIds) {
  if (!groupIds || groupIds.length === 0) return 0;
  
  const groups = await Group.find({ _id: { $in: groupIds }, status: 'ACTIVE' });
  let totalCost = 0;
  
  for (const group of groups) {
    const memberCount = await GroupMember.countDocuments({ 
      group_id: group._id, 
      is_opted_out: false 
    });
    const groupCost = memberCount * group.price_per_message;
    totalCost += groupCost;
  }
  
  return totalCost;
}

/**
 * Calculates the total number of runs for a campaign based on its schedule and recurrence settings.
 * 
 * @param {Object} recurrence - Recurrence settings object { type, end_date, custom_dates }
 * @param {Date} scheduledAt - The initial start date of the campaign
 * @param {number} additionalDatesCount - Optional count of new dates being added (for addSchedule)
 * @returns {number} Total count of execution runs
 */
function calculateTotalRuns(recurrence, scheduledAt, additionalDatesCount = 0) {
    let totalRuns = 1; // Base run
    if (!recurrence || recurrence.type === 'NONE') return totalRuns;

    if (recurrence.type === 'CUSTOM' && recurrence.custom_dates) {
        totalRuns += recurrence.custom_dates.length;
    } else if (['DAILY', 'WEEKLY', 'MONTHLY'].includes(recurrence.type) && recurrence.end_date && scheduledAt) {
        const start = new Date(scheduledAt);
        const end = new Date(recurrence.end_date);
        
        if (end > start) {
            let diffDays = (end - start) / (1000 * 60 * 60 * 24);
            if (recurrence.type === 'DAILY') {
                totalRuns += Math.floor(diffDays); 
            } else if (recurrence.type === 'WEEKLY') {
                totalRuns += Math.floor(diffDays / 7);
            } else if (recurrence.type === 'MONTHLY') {
                let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                if (end.getDate() < start.getDate()) months--;
                totalRuns += Math.max(0, months);
            }
        }
    }
    return totalRuns + additionalDatesCount;
}

/**
 * Creates a new campaign.
 * Handles validation, cost estimation, and wallet balance checks.
 * 
 * @route POST /api/v1/campaigns
 */
exports.createCampaign = async (req, res) => {
  try {
    const { name, description, content, selected_group_ids, scheduled_at, budget_max, user_id } = req.body;
    
    // 1. Check User Subscription Status
    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'BRAND' && (!user.subscription || !user.subscription.active)) {
        return res.status(403).json({ error: 'Subscription Required. Please upgrade your plan.' });
    }

    if (!selected_group_ids || selected_group_ids.length === 0) {
      return res.status(400).json({ error: 'At least one group must be selected' });
    }
    
    // 2. Calculate estimated cost (Single Run)
    const estimatedCostPerRun = await calculateEstimatedCost(selected_group_ids);
    
    // 3. Handle scheduling and time window validation
    let scheduledDateTime = null;
    let status = 'DRAFT';
    
    if (scheduled_at) {
      scheduledDateTime = new Date(scheduled_at);
      const now = new Date();
      
      if (scheduledDateTime <= now) {
        return res.status(400).json({ error: 'Scheduled time must be in the future' });
      }
      
      // Auto-adjust to next valid window if scheduled outside allowed hours
      if (!isWithinAllowedTimeWindow(scheduledDateTime)) {
        const adjustedTime = getNextAllowedTime(scheduledDateTime);
        scheduledDateTime = adjustedTime;
      }
      status = 'SCHEDULED';
    }

    // 4. Calculate total projected cost if recurring
    const recurrence = req.body.recurrence || { type: 'NONE' };
    const totalRuns = calculateTotalRuns(recurrence, scheduledDateTime);
    const totalEstimatedCost = estimatedCostPerRun * totalRuns;

    // 5. Validate budget against wallet balance
    const requiredFunds = budget_max || totalEstimatedCost;

    if (requiredFunds) {
      const wallet = await Wallet.findOne({ owner_id: user_id });
      if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
      if (wallet.balance < requiredFunds) {
        return res.status(400).json({ 
          error: `Insufficient wallet balance for ${totalRuns} run(s)`, 
          balance: wallet.balance,
          required: requiredFunds 
        });
      }
    }
    
    // 6. Calculate Weighted Average Cost per Message for statistics
    const groups = await Group.find({ _id: { $in: selected_group_ids } });
    const totalMembers = groups.reduce((sum, g) => sum + (g.member_count || 0), 0);
    const avgCostPerMsg = totalMembers > 0 
      ? Math.round(estimatedCostPerRun / totalMembers) 
      : (groups.length > 0 ? groups[0].price_per_message : 5);
    
    // 7. Persist Campaign
    const campaign = await Campaign.create({
      brand_id: user_id,
      name,
      description,
      content,
      selected_group_ids,
      scheduled_at: scheduledDateTime,
      budget_max: budget_max || totalEstimatedCost,
      estimated_cost: totalEstimatedCost,
      cost_per_msg: avgCostPerMsg,
      status,
      recurrence: recurrence
    });
    
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ... existing exports.launchCampaign, listCampaigns, estimateCost ...

// Copy them ? No, I'll use replace_file_content smartly or just replace chunks.
// The complexity argument is high, so I should be careful.
// I will just replace the helper functions and createCampaign first, 
// then I will replace addGroups/removeGroup in a second call or same call if contiguous?
// They are not contiguous. createCampaign is at top. addGroups is lower.

// I will target `addGroups` and `removeGroup` specifically in this tool call.
// And I will insert the helper at the top separately? Or duplicate logic inside `addGroups`?
// Duplicating logic is bad. I should declare `calculateTotalRuns` at module scope.
// But I can't easily insert at module scope AND update functions in one replace call if not contiguous.

// Strategy:
// 1. Insert `calculateTotalRuns` at the top (after calculateEstimatedCost).
// 2. Update `createCampaign` to use it (optional, but good for cleanup).
// 3. Update `addGroups`.
// 4. Update `removeGroup`.

// Since I can't do non-contiguous edits in one `replace_file_content`, I need `multi_replace_file_content`.
// Ah, the user manual says `multi_replace_file_content` exists! I should use it.


/**
 * Launches a campaign explicitly (Manual Trigger).
 * Supports overriding schedules and delayed execution if outside allowed time windows.
 * 
 * @route POST /api/v1/campaigns/:id/launch
 */
exports.launchCampaign = async (req, res) => {
  try {
    const { id } = req.params; // Campaign ID
    const campaign = await Campaign.findById(id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
      return res.status(400).json({ error: 'Campaign already processing or done' });
    }

    // 1. Check User Subscription
    const user = await User.findById(campaign.brand_id);
    if (user.role === 'BRAND' && (!user.subscription || !user.subscription.active)) {
         return res.status(403).json({ error: 'Active Subscription Required to launch campaigns.' });
    }

    // 2. Validate wallet balance again before launching
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

    // 3. Check Schedule & Overrides
    const { immediate } = req.body;
    let delay = 0;
    
    if (campaign.scheduled_at) {
      // Manual Launch Override: If user clicks "Launch Now" on a scheduled campaign, reset schedule to NOW
      if (immediate) {
          console.log(`[Launch] Manual override for campaign ${id}. Resetting schedule to NOW.`);
          campaign.scheduled_at = new Date(); 
      }

      const now = new Date();
      if (campaign.scheduled_at > now) {
        // Campaign is scheduled for future (and no override), keep as SCHEDULED
        return res.json({ 
          message: 'Campaign scheduled', 
          campaignId: id,
          scheduledAt: campaign.scheduled_at
        });
      }
      
      // 4. Check Time Window Compliance
      // If outside allowed window (e.g., 9 AM - 9 PM), calculate delay instead of blocking
      if (!isWithinAllowedTimeWindow(now)) {
        const nextWindow = getNextAllowedTime(now);
        delay = nextWindow - now;
        console.log(`[Launch] Outside window. Queuing with delay: ${delay}ms`);
      }
    }

    // 5. Update Status and Add to Queue
    campaign.status = 'PROCESSING';
    await campaign.save();
    
    // Add to Bull Queue with optional delay
    await campaignQueue.add({ campaignId: campaign._id }, { delay });

    res.json({ message: delay > 0 ? 'Campaign queued for next window' : 'Campaign launched', campaignId: id });
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

        // Recalculate estimated cost per run
        const estimatedCostPerRun = await calculateEstimatedCost(allGroupIds);

        // Calculate Total Runs
        const totalRuns = calculateTotalRuns(campaign.recurrence, campaign.scheduled_at);
        
        // Total Estimated Cost = Cost Per Run * Total Runs
        const totalEstimatedCost = estimatedCostPerRun * totalRuns;

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
        // Weighted Avg = Estimated Cost Per Run / Total Members
        // We know Total Cost. We need Total Members.
        // Re-fetch groups to get details
        const groups = await Group.find({ _id: { $in: allGroupIds } });
        
        let totalMembers = groups.reduce((sum, g) => sum + (g.member_count || 0), 0);
        
        if (totalMembers > 0) {
            campaign.cost_per_msg = Math.round(estimatedCostPerRun / totalMembers); // Weighted Average
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

        // Recalculate estimated cost per run
        const estimatedCostPerRun = await calculateEstimatedCost(newGroupIds);
        
        // Calculate Total Runs
        const totalRuns = calculateTotalRuns(campaign.recurrence, campaign.scheduled_at);
        
        const totalEstimatedCost = estimatedCostPerRun * totalRuns;

        // Update Campaign
        campaign.selected_group_ids = newGroupIds;
        campaign.estimated_cost = totalEstimatedCost;
        
        // Recalculate Weighted Average Cost per Message
        const groups = await Group.find({ _id: { $in: newGroupIds } });
        const totalMembers = groups.reduce((sum, g) => sum + (g.member_count || 0), 0);
        
        if (totalMembers > 0) {
            campaign.cost_per_msg = Math.round(estimatedCostPerRun / totalMembers);
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

exports.addSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, additional_dates } = req.body; // additional_dates is array of ISO strings

        const campaign = await Campaign.findById(id);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        if (campaign.brand_id.toString() !== user_id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
            return res.status(400).json({ error: 'Can only modify DRAFT or SCHEDULED campaigns' });
        }
        
        if (!additional_dates || additional_dates.length === 0) {
            return res.status(400).json({ error: 'No dates provided' });
        }

        // 1. Calculate Cost Per Run
        const estimatedCostPerRun = await calculateEstimatedCost(campaign.selected_group_ids);
        
        // 2. Determine Total Runs (Existing + New)
        // Initialize recurrence if needed
        if (!campaign.recurrence) {
            campaign.recurrence = { type: 'CUSTOM', custom_dates: [] };
        } else if (campaign.recurrence.type === 'NONE') {
            campaign.recurrence.type = 'CUSTOM';
            campaign.recurrence.custom_dates = [];
        } else if (['DAILY', 'WEEKLY', 'MONTHLY'].includes(campaign.recurrence.type)) {
             return res.status(400).json({ error: 'Cannot add custom dates to a periodic recurrence. Default to Custom first.' });
        }

        console.log(`[DEBUG] addSchedule - ID: ${id}`);
        console.log(`[DEBUG] Recurrence Type: ${campaign.recurrence.type}`);
        console.log(`[DEBUG] Existing Custom Dates:`, campaign.recurrence.custom_dates);
        console.log(`[DEBUG] Additional Dates Count:`, additional_dates.length);

        const totalRuns = calculateTotalRuns(campaign.recurrence, campaign.scheduled_at, additional_dates.length);
        console.log(`[DEBUG] Calculated Total Runs: ${totalRuns}`);
        
        // 3. Calculate New Total Cost
        const newTotalEstimatedCost = estimatedCostPerRun * totalRuns;
        
        // 4. Check Wallet against NEW Total
        // We ensure wallet can cover the *entire* projected cost.
        const wallet = await Wallet.findOne({ owner_id: user_id });
        if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
        
        if (wallet.balance < newTotalEstimatedCost) {
             const shortfall = newTotalEstimatedCost - wallet.balance;
             return res.status(400).json({ 
                error: `Insufficient wallet balance for total ${totalRuns} run(s). Need ₹${(shortfall/100).toFixed(2)} more.`,
                required: newTotalEstimatedCost,
                balance: wallet.balance
            });
        }
        
        // 5. Update Campaign
        // Add new dates
        campaign.recurrence.custom_dates.push(...additional_dates);
        
        // Update costs
        campaign.estimated_cost = newTotalEstimatedCost;
        
        // Auto-update budget_max if it was consistent with old estimated cost or if it falls short
        // For addSchedule (explicit user action), we assume they want to increase budget to match if needed.
        if (campaign.budget_max < newTotalEstimatedCost) {
             campaign.budget_max = newTotalEstimatedCost;
        }

        await campaign.save();
        
        res.json(campaign);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
