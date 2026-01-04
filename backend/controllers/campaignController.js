const Campaign = require('../models/Campaign');
const { campaignQueue } = require('../jobs/queues');

exports.createCampaign = async (req, res) => {
  try {
    const { name, content, selected_group_ids, cost_per_msg } = req.body;
    const campaign = await Campaign.create({
      brand_id: req.body.user_id, // Passed from auth middleware (mocked)
      name,
      content,
      selected_group_ids,
      cost_per_msg
    });
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.launchCampaign = async (req, res) => {
  try {
    const { id } = req.params; // Campaign ID
    const campaign = await Campaign.findById(id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (campaign.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Campaign already processing or done' });
    }

    // Add to Queue
    await campaignQueue.add({ campaignId: campaign._id });

    res.json({ message: 'Campaign launched', campaignId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find({ brand_id: req.query.user_id });
        res.json(campaigns);
    } catch(err) {
        res.status(500).json({error: err.message});
    }
}
