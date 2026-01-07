const User = require('../models/User');

const PLANS = {
    'MONTHLY': { name: 'Monthly', price: 999, durationDays: 30 },
    'SIX_MONTH': { name: 'Half-Yearly', price: 4999, durationDays: 180 },
    'YEARLY': { name: 'Yearly', price: 8999, durationDays: 365 }
};

exports.getPlans = (req, res) => {
    res.json(PLANS);
};

exports.purchaseSubscription = async (req, res) => {
    try {
        const { plan_id, user_id } = req.body; // user_id passed from frontend or auth middleware
        
        // Validation
        if (!PLANS[plan_id]) {
            return res.status(400).json({ error: 'Invalid Plan ID' });
        }

        const user = await User.findById(user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Logic: Simulate Payment Validation Here
        // ... (Payment Gateway Success) ...

        // Update User
        const durationMs = PLANS[plan_id].durationDays * 24 * 60 * 60 * 1000;
        
        user.subscription = {
            plan_id: plan_id,
            active: true,
            expires_at: new Date(Date.now() + durationMs)
        };

        await user.save();

        res.json({ 
            message: `Successfully subscribed to ${PLANS[plan_id].name}`, 
            subscription: user.subscription,
            user // Return full user to update context
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
