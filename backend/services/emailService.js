const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

let transporter = null;

async function createTransporter() {
    if (transporter) return transporter;

    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
        // Real SMTP
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: false, // true for 465, false for other ports
            auth: { user: SMTP_USER, pass: SMTP_PASS }
        });
        console.log('[Email] Using configured SMTP transport.');
    } else {
        // Fallback: Ethereal (Mock) or just logging
        // For MVP speed without forced credentials, we will just LOG the OTP to terminal
        // But let's try to set up a dummy transporter that prints to console JSON
        transporter = nodemailer.createTransport({
            jsonTransport: true
        });
        console.log('[Email] No SMTP configured. Using JSON Terminal Logger (Dev Mode).');
    }
    return transporter;
}

exports.sendOtpEmail = async (to, otp) => {
    const transport = await createTransporter();
    
    console.log(`\n[Email Service] Prepare sending to: ${to}`);
    
    try {
        const info = await transport.sendMail({
            from: '"MVP Platform" <no-reply@mvp.com>',
            to: to,
            subject: 'Your Verification Code',
            text: `Your verification code is: ${otp}`,
            html: `<div style="font-family: sans-serif; padding: 20px;">
                    <h2>Welcome!</h2>
                    <p>Your verification code is:</p>
                    <h1 style="color: #4F46E5; letter-spacing: 5px;">${otp}</h1>
                    <p>This code expires in 10 minutes.</p>
                   </div>`
        });

        console.log(`[Email Service] Message sent: ${info.messageId}`);
        return info;
    } catch (err) {
        console.error(`[Email Service] ⚠️ FAILED to send email: ${err.message}`);
        console.log(`[Email Service] 🔄 FALLBACK: Switching to Console Log so you can continue.`);
        
        console.log(`\n---------------------------------------------------`);
        console.log(`[DEV FALLBACK] To: ${to}`);
        console.log(`[DEV FALLBACK] OTP: ${otp}`);
        console.log(`---------------------------------------------------\n`);
        
        return { messageId: 'fallback-console-log' }; // Mock success
    }
};
