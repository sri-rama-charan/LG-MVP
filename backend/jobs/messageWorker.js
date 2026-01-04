const { messageQueue } = require('./queues');
const { MessageLog } = require('../models/Logs');
const GroupMember = require('../models/GroupMember');
const Wallet = require('../models/Wallet');
const Campaign = require('../models/Campaign');

// Simulate BSP Send
async function sendToWhatsApp(phone, content) {
    // Integration with Twilio/Meta would go here.
    // For MVP: Log and return success
    console.log(`[BSP] Sending to ${phone}: ${content}`);
    return { message_id: 'wa_' + Math.random().toString(36).substr(2, 9) };
}

messageQueue.process(async (job) => {
    const { campaignId, phone, groupId, memberId, content, cost } = job.data;

    const session = await Wallet.startSession();
    session.startTransaction();

    try {
        // 1. Debit Wallet (Double check)
        const campaign = await Campaign.findOne({ _id: campaignId }); // helper to get brand_id
        const wallet = await Wallet.findOne({ owner_id: campaign.brand_id }).session(session);
        
        if (wallet.balance < cost) {
            throw new Error('Insufficient Funds during send');
        }

        wallet.balance -= cost;
        wallet.transactions.push({
            type: 'DEBIT',
            amount: cost,
            reference_id: campaignId.toString(),
            description: `Msg to ${phone}`
        });
        await wallet.save({ session });

        // 2. Send Message (External Call)
        // Note: Do not do external calls inside transaction usually, but for MVP it's okay-ish 
        // OR do it before commit. If send fails, abort transaction.
        const response = await sendToWhatsApp(phone, content);

        // 3. Update Member Stats
        const today = new Date();
        today.setHours(0,0,0,0);
        
        await GroupMember.findByIdAndUpdate(memberId, {
             $inc: { daily_sent_count: 1 },
             last_sent_date: today, // Ensure date is updated
        }).session(session);

        // 4. Create Log
        await MessageLog.create([{
            campaign_id: campaignId,
            phone: phone,
            group_id: groupId,
            status: 'SENT',
            message_id: response.message_id,
            cost: cost
        }], { session });

        // 5. Update Campaign Stats
        await Campaign.findByIdAndUpdate(campaignId, { $inc: { 'stats.sent': 1 } }).session(session);

        await session.commitTransaction();
        session.endSession();

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(`Failed to send to ${phone}`, err);
        // Retry logic is handled by Bull
        throw err;
    }
});

console.log('Message Worker Started');
