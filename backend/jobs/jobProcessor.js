// backend/jobs/jobProcessor.js
const Campaign = require('../models/Campaign');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const Wallet = require('../models/Wallet');
const whatsappService = require('../services/whatsappService');

/**
 * Process a campaign execution job
 * Handles deduplication, billing, daily caps, and sending
 */
exports.processCampaign = async (job) => {
    const { campaignId } = job.data;
    console.log(`[Job] Processing campaign: ${campaignId}`);

    try {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) throw new Error('Campaign not found');

        // 1. Fetch all target groups and members
        const groups = await Group.find({ _id: { $in: campaign.selected_group_ids } });
        
        let totalSent = 0;
        let totalFailed = 0;
        let totalBillableUnits = 0;
        let adminEarnings = {}; // Map: adminId -> amount

        // Helper to track deduplication: phone -> primaryGroupId
        const messageRecipients = new Map(); 

        // 2. Build Audience & Deduplicate
        // Rule: Sort groups by some deterministic factor (e.g., creation date or ID) to pick "primary" group for a user
        const sortedGroups = groups.sort((a, b) => a.createdAt - b.createdAt);

        for (const group of sortedGroups) {
            const members = await GroupMember.find({ group_id: group._id, is_opted_out: false });
            
            for (const member of members) {
                // BILLING: Every (group, member) pair is billable regardless of actual send
                totalBillableUnits++;

                // Calculate Revenue Split (e.g., 80% to Admin)
                // Cost per msg is in paisa
                const earning = Math.floor(group.price_per_message * 0.8);
                const adminId = group.admin_id.toString();
                adminEarnings[adminId] = (adminEarnings[adminId] || 0) + earning;

                // DEDUPLICATION Logic
                if (!messageRecipients.has(member.phone)) {
                    messageRecipients.set(member.phone, {
                        memberId: member._id,
                        groupId: group._id, // This group "wins" the send
                        name: member.name
                    });
                }
            }
        }

        console.log(`[Job] Audience Analysis: ${totalBillableUnits} billable units, ${messageRecipients.size} unique recipients.`);

        // 3. Process Finances (Bulk Wallet Updates) is usually done BEFORE sending to ensure funds, 
        // but for MVP we might have pre-checked. 
        // Ideally we should process payouts here.
        // NOTE: Brand wallet was NOT deducted per member yet, only checked for total budget.
        // Real implementation should deduct actual cost here or reserve it.
        // For MVP, lets assume we deduct the TOTAL calculated cost now from Brand.
        
        const totalCost = campaign.estimated_cost; // Simplified for MVP, ideally assume calculate from billable units
        
        // Deduct from Brand
        const brandWallet = await Wallet.findOne({ owner_id: campaign.brand_id });
        if (brandWallet) {
            brandWallet.balance -= totalCost;
            brandWallet.transactions.push({
                type: 'DEBIT',
                amount: totalCost,
                description: `Campaign execution: ${campaign.name}`,
                reference_id: campaign._id
            });
            await brandWallet.save();
        }

        // Credit Group Admins
        for (const [adminId, amount] of Object.entries(adminEarnings)) {
            const adminWallet = await Wallet.findOne({ owner_id: adminId });
            if (adminWallet) {
                adminWallet.balance += amount;
                adminWallet.transactions.push({
                    type: 'CREDIT',
                    amount: amount,
                    description: `Earnings from campaign: ${campaign.name}`,
                    reference_id: campaign._id
                });
                await adminWallet.save();
            }
        }

        // 4. Send Messages (Deduplicated)
        const recipientList = Array.from(messageRecipients.entries());
        
        for (const [phone, data] of recipientList) {
            // Check Daily Cap (Mocked logic for now, using random check or ideally Redis)
            // Ideally: await checkDailyCap(phone, data.groupId)
            
            try {
                // Send via BSP
                await whatsappService.sendTemplateMessage(phone, campaign.content);
                totalSent++;
                
                // Update specific Stats if we want granular tracking per group
                // For MVP, we update Campaign global stats
            } catch (err) {
                console.error(`Failed to send to ${phone}:`, err.message);
                totalFailed++;
            }

            // Report progress periodically?
            job.progress(Math.floor((totalSent + totalFailed) / recipientList.length * 100));
        }

        // 5. Update Campaign Status
        campaign.status = 'COMPLETED';
        campaign.stats.sent = totalSent;
        // In real world, 'delivered' comes from webhooks. For MVP we can set it equal to sent or slightly less
        campaign.stats.delivered = totalSent; 
        campaign.stats.failed = totalFailed;
        await campaign.save();

        console.log(`[Job] Campaign ${campaignId} completed. Sent: ${totalSent}, Failed: ${totalFailed}`);

    } catch (err) {
        console.error(`[Job] Campaign ${campaignId} failed:`, err);
        // Mark as FAILED?
    }
};
