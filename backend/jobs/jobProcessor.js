// backend/jobs/jobProcessor.js
const Campaign = require('../models/Campaign');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const Wallet = require('../models/Wallet');
const whatsappService = require('../services/whatsappService');

/**
 * Process a campaign execution job from the queue.
 * This is the core engine that runs when a campaign triggers.
 * 
 * Workflow:
 * 1. Fetch Campaign and Target Groups.
 * 2. Audience Construction & Deduplication (User in multiple groups? Send once).
 * 3. Financial Processing (Debit Brand for run cost, Credit Admin for billable members).
 * 4. Message Dispatch (Send via WhatsApp Service).
 * 5. Status Update (Mark COMPLETED, save stats).
 * 
 * @param {Object} job - Bull Job object containing campaignId
 */
exports.processCampaign = async (job) => {
    const { campaignId } = job.data;
    console.log(`[Job] Processing campaign: ${campaignId}`);

    try {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) throw new Error('Campaign not found');

        // ==========================================
        // 1. Fetch all target groups
        // ==========================================
        const groups = await Group.find({ _id: { $in: campaign.selected_group_ids } });
        
        let totalSent = 0;
        let totalFailed = 0;
        let totalBillableUnits = 0; // Count of potential reaches (before dedupe) for billing
        
        // Helper to track deduplication: phone -> primaryGroupId
        const messageRecipients = new Map(); 
        const pendingCredits = []; // { adminId, amount, groupName }

        // ==========================================
        // 2. Build Audience & Deduplicate
        // ==========================================
        // Rule: Sort groups by creation date (older first). 
        // If a user is in multiple groups, the *first* group they appear in gets the credit ("primary").
        const sortedGroups = groups.sort((a, b) => a.createdAt - b.createdAt);
        
        for (const group of sortedGroups) {
            const members = await GroupMember.find({ group_id: group._id, is_opted_out: false });
            let groupTotalEarnings = 0;

            for (const member of members) {
                // BILLING RULE: Every (group, member) pair is billable regardless of actual send (Group Admin gets paid for renting their audience).
                totalBillableUnits++;

                // Calculate Revenue Split (e.g., 80% to Admin)
                // Cost per msg is in paisa
                const earning = Math.floor(group.price_per_message * 0.8);
                groupTotalEarnings += earning;

                // DEDUPLICATION Logic
                if (!messageRecipients.has(member.phone)) {
                    messageRecipients.set(member.phone, {
                        memberId: member._id,
                        groupId: group._id, // This group "wins" the send
                        name: member.name
                    });
                }
            }
            
            // Queue credit for this group admin
            if (groupTotalEarnings > 0) {
                pendingCredits.push({
                    adminId: group.admin_id.toString(),
                    amount: groupTotalEarnings,
                    groupName: group.name
                });
            }
        }

        console.log(`[Job] Audience Analysis: ${totalBillableUnits} billable units, ${messageRecipients.size} unique recipients.`);

        // ==========================================
        // 3. Process Finances (Bulk Wallet Updates)
        // ==========================================
        
        // A. Deduct from Brand Wallet
        // Logic: Debit cost for THIS run only (Billable Units * Cost Per Msg)
        const costForThisRun = totalBillableUnits * (campaign.cost_per_msg || 0);
        console.log(`[Job] Debiting ${costForThisRun} (Units: ${totalBillableUnits} * Cost: ${campaign.cost_per_msg})`);
        
        const brandWallet = await Wallet.findOne({ owner_id: campaign.brand_id });
        if (brandWallet) {
            brandWallet.balance -= costForThisRun;
            brandWallet.transactions.push({
                type: 'DEBIT',
                amount: costForThisRun,
                description: `Campaign execution: ${campaign.name}`,
                reference_id: campaign._id
            });
            await brandWallet.save();
        }

        // B. Credit Group Admins
        // Loop through pending credits and update each admin's wallet
        for (const credit of pendingCredits) {
            const adminWallet = await Wallet.findOne({ owner_id: credit.adminId });
            if (adminWallet) {
                adminWallet.balance += credit.amount;
                adminWallet.transactions.push({
                    type: 'CREDIT',
                    amount: credit.amount,
                    description: `Earnings from campaign: ${campaign.name}`,
                    reference_id: campaign._id,
                    metadata: { group_name: credit.groupName }
                });
                await adminWallet.save();
            }
        }

        // ==========================================
        // 4. Send Messages (Deduplicated List)
        // ==========================================
        const recipientList = Array.from(messageRecipients.entries());
        
        for (const [phone, data] of recipientList) {
            try {
                // Send via BSP (WhatsApp Service)
                await whatsappService.sendTemplateMessage(phone, campaign.content);
                totalSent++;
                
                // TODO: Update specific Stats if we want granular tracking per group
            } catch (err) {
                console.error(`Failed to send to ${phone}:`, err.message);
                totalFailed++;
            }

            // Report progress periodically to Redis (can be used by UI)
            job.progress(Math.floor((totalSent + totalFailed) / recipientList.length * 100));
        }

        // ==========================================
        // 5. Update Campaign Status
        // ==========================================
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
        // Check if retry logic is needed in queues.js
    }
};
