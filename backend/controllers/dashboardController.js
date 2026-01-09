const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Group = require('../models/Group');
const Wallet = require('../models/Wallet');

/**
 * Get Dashboard Statistics
 * GET /api/dashboard/stats
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role; // BRAND or GROUP_ADMIN

        // Common: Wallet Balance
        let wallet = await Wallet.findOne({ owner_id: userId });
        if (!wallet) {
            wallet = { balance: 0, currency: 'INR' };
        }

        const stats = {
            role,
            walletBalance: wallet.balance,
            currency: wallet.currency
        };

        if (role === 'BRAND') {
            // Brand Specific Stats
            const totalCampaigns = await Campaign.countDocuments({ brand_id: userId });
            const activeCampaigns = await Campaign.countDocuments({ brand_id: userId, status: 'ACTIVE' });
            const completedCampaigns = await Campaign.countDocuments({ brand_id: userId, status: 'COMPLETED' });
            
            // Calculate Total Spend (This is an estimate, ideally from Wallet transactions or Campaign spend tracking)
            // For now, let's sum the 'estimated_cost' of all non-draft campaigns
            const campaigns = await Campaign.find({ brand_id: userId, status: { $ne: 'DRAFT' } }).select('estimated_cost');
            const totalSpend = campaigns.reduce((acc, curr) => acc + (curr.estimated_cost || 0), 0);

            stats.brand = {
                totalCampaigns,
                activeCampaigns,
                completedCampaigns,
                totalSpend
            };
            
            // Recent Campaigns
            stats.recentActivity = await Campaign.find({ brand_id: userId })
                .sort({ created_at: -1 })
                .limit(5)
                .select('name status created_at cost');

        } else if (role === 'GROUP_ADMIN') {
            // Group Admin Specific Stats
            const groups = await Group.find({ admin_id: userId });
            const totalGroups = groups.length;
            
            // Calculate Total Reach (Sum of members in all groups)
            // Note: This matches the array length. In a real large scale, we might optimize this.
            // Calculate Total Reach (Sum of members in all groups)
            const totalReach = groups.reduce((acc, curr) => acc + (curr.member_count || 0), 0);

            // Verified Groups
            const verifiedGroups = groups.filter(g => g.is_verified).length;

            stats.groupAdmin = {
                totalGroups,
                totalReach,
                verifiedGroups
            };

            // Top Groups by Members
            stats.topGroups = groups
                .sort((a, b) => (b.member_count || 0) - (a.member_count || 0))
                .slice(0, 5)
                .map(g => ({ name: g.name, memberCount: g.member_count || 0, category: g.category }));
        }

        res.json(stats);

    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ error: 'Server error fetching dashboard stats' });
    }
};
