const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');

exports.createGroup = async (req, res) => {
  try {
    const { name, daily_cap_per_member, price_per_message, tags, monetization_enabled, consent_declared, invite_link, approx_member_count } = req.body;
    
    // Validate consent
    if (monetization_enabled && !consent_declared) {
        return res.status(400).json({ error: 'Consent must be declared to enable monetization.' });
    }

    const group = await Group.create({
      admin_id: req.user.user_id,
      name,
      daily_cap_per_member,
      approx_member_count,
      tags,
      monetization_enabled,
      consent_declared,
      price_per_message,
      invite_link
    });
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listGroups = async (req, res) => {
    try {
        const groups = await Group.find({ admin_id: req.query.user_id });
        res.json(groups);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
}

exports.addMembers = async (req, res) => {
  try {
    const { group_id, phones } = req.body; // Array of numbers
    
    // MVP: Sequential create (slow but simple)
    // Real: BulkWrite
    let added = 0;
    
    // Normalize input to array of objects
    const memberList = phones.map(p => {
        if (typeof p === 'string') return { phone: p };
        return p; // Assume object { phone, isAdmin, isSuperAdmin }
    });

    for (const member of memberList) {
        try {
            await GroupMember.create({ 
                group_id, 
                phone: member.phone,
                isAdmin: member.isAdmin || false,
                isSuperAdmin: member.isSuperAdmin || false
            });
            added++;
        } catch (e) {
            // Ignore dupes
        }
    }
    
    // Update count
    await Group.findByIdAndUpdate(group_id, { $inc: { member_count: added } });

    res.json({ message: `Added ${added} members` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAvailableGroups = async (req, res) => {
    try {
        // For Brands to select with optional filtering
        const { city, state, language, interest, profession, income_band } = req.query;
        const query = { status: 'ACTIVE', monetization_enabled: true };
        
        // Build tag filters
        if (city) query['tags.city'] = new RegExp(city, 'i');
        if (state) query['tags.state'] = new RegExp(state, 'i');
        if (language) query['tags.language'] = new RegExp(language, 'i');
        if (interest) query['tags.interest'] = new RegExp(interest, 'i');
        if (profession) query['tags.profession'] = new RegExp(profession, 'i');
        if (income_band) query['tags.income_band'] = new RegExp(income_band, 'i');
        
        const groups = await Group.find(query).sort({ member_count: -1 });
        res.json(groups);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
}

exports.getMembers = async (req, res) => {
    try {
        const members = await GroupMember.find({ group_id: req.params.id });
        res.json(members);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
}

// Scraper Endpoints
const whatsappScraperService = require('../services/whatsappScraperService');

exports.initScraper = async (req, res) => {
    try {
        whatsappScraperService.init();
        res.json({ message: 'Scraper initializing' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getScraperStatus = async (req, res) => {
    try {
        const { status, qrCode } = whatsappScraperService.getStatus();
        res.json({ status, qr: qrCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.scrapeGroupLink = async (req, res) => {
    try {
        const { link } = req.body;
        if (!link) return res.status(400).json({ error: 'Link is required' });

        const result = await whatsappScraperService.scrapeGroup(link);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.logoutScraper = async (req, res) => {
    try {
        await whatsappScraperService.logout();
        res.json({ message: 'Logged out' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteGroup = async (req, res) => {
    try {
        const { id } = req.params;
        // Optional: Check ownership if req.user is available via middleware
        // const group = await Group.findOne({ _id: id, admin_id: req.user._id });
        
        const group = await Group.findByIdAndDelete(id);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Clean up members
        await GroupMember.deleteMany({ group_id: id });

        res.json({ message: 'Group deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
