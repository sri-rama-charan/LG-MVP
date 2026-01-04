const Wallet = require('../models/Wallet');

exports.getBalance = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ owner_id: req.query.user_id });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.topUp = async (req, res) => {
  // Manual top-up by Admin (MVP)
  try {
    const { user_id, amount } = req.body; // Target user
    const wallet = await Wallet.findOne({ owner_id: user_id });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    wallet.balance += amount;
    wallet.transactions.push({
      type: 'CREDIT',
      amount,
      description: 'Manual Top-up'
    });
    await wallet.save();

    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.requestPayout = async (req, res) => {
  try {
    const { user_id, amount, bank_details } = req.body;
    const wallet = await Wallet.findOne({ owner_id: user_id });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    if (wallet.balance < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Debit immediately for MVP
    wallet.balance -= amount;
    wallet.transactions.push({
        type: 'DEBIT',
        amount: amount,
        description: `Payout Request: ${bank_details}`,
        timestamp: new Date()
    });
    
    await wallet.save();
    res.json({ message: 'Payout requested successfully', balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
