const User = require('../models/User');
const Wallet = require('../models/Wallet');
// For MVP, skipping bcrypt/jwt complexity implementation deatils, assuming basic storage or placeholder
// In real app: use bcryptjs and jsonwebtoken

exports.register = async (req, res) => {
  try {
    const { name, phone, email, password, role } = req.body;
    // Check existing
    const existing = await User.findOne({ $or: [{email}, {phone}] });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const user = await User.create({
      name, phone, email, password_hash: password, role // Insecure password storage for MVP Demo speed
    });

    // Create Wallet for Brands/GAs
    await Wallet.create({ owner_id: user._id });

    res.status(201).json({ message: 'User registered', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ message: 'Login successful', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
