const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');

exports.createGroup = async (req, res) => {
  try {
    const { name, daily_cap_per_member, user_id, approx_member_count, tags, monetization_enabled, consent_declared, price_per_message } = req.body;
    
    // Validate consent
    if (monetization_enabled && !consent_declared) {
        return res.status(400).json({ error: 'Consent must be declared to enable monetization.' });
    }

    const group = await Group.create({
      admin_id: user_id,
      name,
      daily_cap_per_member,
      approx_member_count,
      tags,
      monetization_enabled,
      consent_declared,
      price_per_message
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
    for (const phone of phones) {
        try {
            await GroupMember.create({ group_id, phone });
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
        // For Brands to select
        const groups = await Group.find({ status: 'ACTIVE' });
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
