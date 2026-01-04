const { campaignQueue, messageQueue } = require('./queues');
const Campaign = require('../models/Campaign');
const GroupMember = require('../models/GroupMember');
const Group = require('../models/Group');
const { OptOut, MessageLog } = require('../models/Logs');
const Wallet = require('../models/Wallet');
const mongoose = require('mongoose');

// Dedup Logic
async function getUniqueTargets(groupIds) {
  // 1. Fetch all valid members from selected groups
  // We need to fetch group_id as well to enforce caps later
  const members = await GroupMember.find({ 
    group_id: { $in: groupIds },
    is_opted_out: false 
  }).select('phone group_id daily_sent_count last_sent_date');

  // 2. Dedup by Phone
  // Strategy: simple first-found. 
  // Improvement: Select group with lowest saturation or highest priority? 
  // MVP: Map phone -> member
  const uniqueTargets = new Map();
  
  for (const m of members) {
    if (!uniqueTargets.has(m.phone)) {
        uniqueTargets.set(m.phone, m);
    }
  }

  // 3. Filter OptOuts (Global list)
  const optOuts = await OptOut.find({ phone: { $in: Array.from(uniqueTargets.keys()) } });
  const optOutPhones = new Set(optOuts.map(o => o.phone));

  for (const [phone, member] of uniqueTargets) {
    if (optOutPhones.has(phone)) {
        uniqueTargets.delete(phone);
    }
  }

  return Array.from(uniqueTargets.values());
}

// Daily Cap Check
async function checkCap(member) {
  const today = new Date();
  today.setHours(0,0,0,0);

  const group = await Group.findById(member.group_id); // Optimization: cache groups
  
  if (!member.last_sent_date || member.last_sent_date < today) {
    return true; // New day, cap reset
  }
  
  return member.daily_sent_count < group.daily_cap_per_member;
}

// Processor
campaignQueue.process(async (job) => {
    const { campaignId } = job.data;
    console.log(`Processing Campaign: ${campaignId}`);

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    campaign.status = 'PROCESSING';
    await campaign.save();

    try {
        const targets = await getUniqueTargets(campaign.selected_group_ids);
        console.log(`Found ${targets.length} unique targets.`);

        let processed = 0;

        for (const member of targets) {
            // Check Cap
            if (await checkCap(member)) {
                
                // Add to Message Queue (Debit happens there or here? Better here to reserve funds?)
                // MVP: Add to message queue, debit later or check balance now. 
                // Let's do check balance now.
                
               const brandWallet = await Wallet.findOne({ owner_id: campaign.brand_id });
               if (brandWallet.balance < campaign.cost_per_msg) {
                   console.log('Insufficient Funds, pausing campaign');
                   break;
               }

               // Atomic Debit (Simplification for MVP)
                // ideally we use transactions.
               await messageQueue.add({
                   campaignId: campaign._id,
                   phone: member.phone,
                   groupId: member.group_id,
                   memberId: member._id,
                   content: campaign.content,
                   cost: campaign.cost_per_msg
               });
               
               processed++;
            }
        }

        campaign.status = 'COMPLETED'; // or PARTIAL if out of funds
        await campaign.save();

    } catch (err) {
        console.error(err);
        campaign.status = 'FAILED';
        await campaign.save();
    }
});

console.log('Campaign Worker Started');
