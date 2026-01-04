const { MessageLog, OptOut } = require('../models/Logs');
const Wallet = require('../models/Wallet');
const Group = require('../models/Group');
const mongoose = require('mongoose');

exports.handleWhatsappWebhook = async (req, res) => {
    // MVP: Simulate receiving events.
    // In real world, this parses the complex WA JSON Payload.
    // We will assume a simplified payload for this MVP: 
    // { type: 'STATUS'|'INBOUND', message_id, status, phone, text }
    
    try {
        const { type, message_id, status, phone, text } = req.body;
        console.log('Webhook received:', req.body);

        if (type === 'STATUS') {
            await handleStatusUpdate(message_id, status);
        } else if (type === 'INBOUND') {
            await handleInboundMessage(phone, text);
        }

        res.json({ received: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

async function handleStatusUpdate(message_id, status) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const msg = await MessageLog.findOne({ message_id }).session(session);
        if (!msg) throw new Error('Message not found');

        // Update status
        msg.status = status;
        await msg.save({ session });

        // Revenue Split if DELIVERED and not yet paid
        if (status === 'DELIVERED' && !msg.is_paid) {
            const cost = msg.cost;
            const adminShare = cost * 0.20;
            const gaShare = cost * 0.80;

            // Credit Group Admin
            const group = await Group.findById(msg.group_id).session(session);
            const gaWallet = await Wallet.findOne({ owner_id: group.admin_id }).session(session);
            
            gaWallet.balance += gaShare;
            gaWallet.transactions.push({
                type: 'CREDIT',
                amount: gaShare,
                description: `Earnings for msg ${message_id}`,
                reference_id: message_id,
                metadata: {
                    group_id: group._id.toString(),
                    group_name: group.name
                }
            });
            await gaWallet.save({ session });
            
            // Mark paid
            msg.is_paid = true;
            await msg.save({ session });
        }
        
        // Also update Campaign stats (basic increments)
        if (status === 'DELIVERED') {
            await mongoose.model('Campaign').findByIdAndUpdate(msg.campaign_id, { $inc: { 'stats.delivered': 1 } }).session(session);
        } else if (status === 'READ') {
            await mongoose.model('Campaign').findByIdAndUpdate(msg.campaign_id, { $inc: { 'stats.read': 1 } }).session(session);
        } else if (status === 'FAILED') {
            await mongoose.model('Campaign').findByIdAndUpdate(msg.campaign_id, { $inc: { 'stats.failed': 1 } }).session(session);
        }

        await session.commitTransaction();
    } catch(err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

async function handleInboundMessage(phone, text) {
    if (!text) return;
    
    const cleanText = text.trim().toUpperCase();
    if (cleanText === 'STOP') {
        try {
            await OptOut.create({ phone });
            console.log(`Opt-out recorded for ${phone}`);
        } catch(e) {
            // Include duplicate error
        }
    }
}
