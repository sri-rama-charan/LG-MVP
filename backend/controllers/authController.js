const User = require('../models/User');
const Wallet = require('../models/Wallet');
const emailService = require('../services/emailService');

// Helper to generate 6 digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.register = async (req, res) => {
  try {
    const { name, phone, email, password, role } = req.body;
    
    // Check if user exists
    let user = await User.findOne({ $or: [{email}, {phone}] });
    
    if (user) {
        if (user.is_verified) {
             return res.status(400).json({ error: 'User already exists and is verified. Please login.' });
        }
        // If exists but NOT verified, update it (re-send OTP flow)
        // We update the details just in case they fixed a typo in name/role
        user.name = name;
        user.password_hash = password; 
        user.role = role;
    } else {
        // Create new UNVERIFIED user
        user = new User({
            name, phone, email, password_hash: password, role, is_verified: false
        });
        // Create Wallet immediately (or wait for verify? Better wait, but for code simplicity sticking to create)
        await Wallet.create({ owner_id: user._id });
    }

    // Generate OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otp_expires = Date.now() + 10 * 60 * 1000; // 10 mins

    await user.save();

    // Send OTP via Email
    await emailService.sendOtpEmail(email, otp);

    res.status(200).json({ 
        message: 'OTP sent to email', 
        status: 'PENDING_OTP',
        email: email // Return email to confirm where it went
    });

  } catch (err) {
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(400).json({ error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists. Please login.` });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ error: 'User not found' });
        
        if (user.is_verified) {
            return res.status(200).json({ message: 'User already verified', user });
        }

        if (user.otp !== otp) {
            console.log(`[Auth] OTP Mismatch! Received: '${otp}' (Type: ${typeof otp}) vs Stored: '${user.otp}' (Type: ${typeof user.otp})`);
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        if (user.otp_expires < Date.now()) {
            return res.status(400).json({ error: 'OTP Expired' });
        }

        // Success
        user.is_verified = true;
        user.otp = undefined;
        user.otp_expires = undefined;
        await user.save();

        res.json({ message: 'Verification successful', user });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
  console.log('[Auth] Login attempt starting...');
  try {
    const { email, password } = req.body;
    console.log(`[Auth] Queries for email: ${email}`);
    
    // Explicitly await and log
    const user = await User.findOne({ email });
    console.log(`[Auth] DB Query Result:`, user ? 'Found User' : 'User Not Found');
    
    if (!user) {
        console.log('[Auth] User not found during login');
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Simple password check (MVP)
    if (user.password_hash !== password) {
       console.log('[Auth] Password mismatch');
       return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Enforce Verification
    console.log(`[Auth] Checking Verification Status: ${user.is_verified}`);
    if (user.is_verified === false) { // Strict check just in case
        console.log('[Auth] User unverified');
        return res.status(403).json({ 
            error: 'Account not verified', 
            status: 'PENDING_OTP',
            email: user.email 
        });
    }

    console.log('[Auth] Login Successful. Sending response.');
    res.json({ message: 'Login successful', user });
  } catch (err) {
    console.error('[Auth] Login Error:', err);
    res.status(500).json({ error: err.message });
  }
};
