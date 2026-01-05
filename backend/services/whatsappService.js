const axios = require('axios');

// Environment Configuration
const PROVIDER = process.env.WHATSAPP_PROVIDER || 'MOCK'; // 'META', 'TWILIO', 'MOCK'
const TEST_NUMBER = process.env.WHATSAPP_TEST_NUMBER || '8977958449'; 
// Safety Flag: Default to TRUE to prevent accidental spam. Set to 'false' in .env to disable.
const SEND_TO_TEST_NUMBER_ONLY = process.env.WHATSAPP_SAFE_MODE !== 'false';

// Meta Graph API Config
const META_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const META_TOKEN = process.env.WHATSAPP_TOKEN;

/**
 * Send WhatsApp Template Message
 * @param {string} originalTo - The recipient phone number from DB
 * @param {string} content - Message content (or template name in real world)
 */
exports.sendTemplateMessage = async (originalTo, content) => {
    let to = originalTo;

    // 1. SAFETY OVERRIDE: Redirect to test number?
    // This is crucial for MVP demo with fake DB numbers
    if (SEND_TO_TEST_NUMBER_ONLY && TEST_NUMBER) {
        console.log(`[WhatsApp] 🛡️ SAFE MODE: Redirecting from ${originalTo} to ${TEST_NUMBER}`);
        to = TEST_NUMBER;
    }

    console.log(`[WhatsApp] Attempting send via ${PROVIDER} to ${to}...`);

    try {
        if (PROVIDER === 'META') {
            if (!META_PHONE_ID || !META_TOKEN) throw new Error('Missing Meta Credentials');
            
            // Meta Graph API (v17.0)
            const url = `https://graph.facebook.com/v17.0/${META_PHONE_ID}/messages`;
            const payload = {
                messaging_product: 'whatsapp',
                to: to,
                type: 'text', // Using text for MVP simple testing, usually 'template'
                text: { body: content }
            };

            const response = await axios.post(url, payload, {
                headers: { 
                    'Authorization': `Bearer ${META_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return { provider: 'META', id: response.data.messages[0].id, status: 'sent' };

        } else if (PROVIDER === 'TWILIO') {
            const accountSid = process.env.TWILIO_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            if (!accountSid || !authToken) throw new Error('Missing Twilio Credentials');

            const client = require('twilio')(accountSid, authToken);
            
            // Allow custom 'From' number for Paid Accounts (Production)
            // Default is the Sandbox Number
            const from = process.env.TWILIO_FROM_NUMBER || 'whatsapp:+14155238886'; 
            
            // Ensure 'to' has whatsapp: prefix
            const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:+${to.replace(/\+/g, '')}`;

            const message = await client.messages.create({
                body: content,
                from: from,
                to: toFormatted
            });
            
            return { provider: 'TWILIO', id: message.sid, status: message.status };

        } else {
            // MOCK Provider (Default)
            await new Promise(r => setTimeout(r, 800)); // Simulate delay
            
            // Log explicitly for the user to see in terminal
            console.log(`\n---------------------------------------------------`);
            console.log(`[MOCK WHATSAPP] Message Sent Successfully!`);
            console.log(`To: ${to} (Redirected from ${originalTo})`);
            console.log(`Content: ${content}`);
            console.log(`---------------------------------------------------\n`);

            return { provider: 'MOCK', id: `mock_${Date.now()}`, status: 'delivered' };
        }
    } catch (err) {
        console.error(`[WhatsApp] Send Failed:`, err.response ? err.response.data : err.message);
        throw err; // Propagate error to mark job as failed
    }
};
