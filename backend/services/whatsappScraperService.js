const { Client, LocalAuth } = require('whatsapp-web.js');

let client = null;
let qrCode = null;
let status = 'idle'; // idle, initializing, qr_ready, authenticated, scraping
let sessionData = null;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const cleanupClient = async () => {
    if (client) {
        try {
            console.log('[Scraper] Destroying old client...');
            // Remove listeners to prevent further errors
            client.removeAllListeners();
            await client.destroy();
        } catch (e) {
            console.error('[Scraper] Error destroying client:', e.message);
        }
        client = null;
    }
    status = 'idle';
    qrCode = null;
};

const init = async (retryCount = 0) => {
    // Prevent double init
    if (status === 'initializing' || status === 'authenticated' || status === 'qr_ready') {
        console.log(`[Scraper] Client already running (Status: ${status})`);
        return;
    }

    console.log(`[Scraper] Initializing Client (Attempt ${retryCount + 1})...`);
    status = 'initializing';
    qrCode = null;

    try {
        // Ensure clean slate
        if (client) await cleanupClient();

        client = new Client({
            authStrategy: new LocalAuth({ clientId: 'scraper-bot', dataPath: './.wwebjs_auth' }), // Explicit path
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ],
                timeout: 0, // Disable default timeout
                protocolTimeout: 300000 // Increase protocol timeout to 5 minutes
            }
        });

        client.on('qr', (qr) => {
            console.log('[Scraper] QR Received');
            qrCode = qr;
            status = 'qr_ready';
        });

        client.on('ready', () => {
            console.log('[Scraper] Client is ready!');
            status = 'authenticated';
            qrCode = null;
        });

        client.on('auth_failure', async () => {
            console.error('[Scraper] Auth failure');
            await cleanupClient();
        });

        client.on('disconnected', async (reason) => {
            console.log('[Scraper] Disconnected:', reason);
            await cleanupClient();
        });

        // Initialize with error catching
        client.initialize().catch(async (err) => {
            console.error('[Scraper] Initialization Error:', err.message);
            // Don't kill process, just cleanup
            const wasInitializing = status === 'initializing';
            await cleanupClient();
            
            if (wasInitializing && retryCount < 3) {
                console.log(`[Scraper] Retrying init after failure (${retryCount + 1}/3)...`);
                await delay(2000); // Wait 2s
                init(retryCount + 1);
            }
        });

    } catch (err) {
        console.error('[Scraper] Setup Error:', err);
        status = 'idle';
    }
};

const getStatus = () => {
    return { status, qrCode };
};

const scrapeGroup = async (inviteLink) => {
    if (!client || status !== 'authenticated') {
        throw new Error('Scraper not authenticated. Please scan QR Code first.');
    }

    // Extract Invite Code
    const codeMatch = inviteLink.match(/chat\.whatsapp\.com\/([A-Za-z0-9]{20,})/);
    if (!codeMatch) {
        throw new Error('Invalid WhatsApp Group Link format');
    }
    const inviteCode = codeMatch[1];

    console.log(`[Scraper] Joining group via code: ${inviteCode}`);
    
    try {
        // Accept Invite
        let groupId = await client.acceptInvite(inviteCode);
        console.log(`[Scraper] Joined Group Result: ${groupId}`);
        
        // Wait for chat to sync
        console.log('[Scraper] Waiting for chat sync...');
        await delay(1000); // reduced from 10s to 1s to rely on retry loop

        // If acceptInvite returns undefined (already joined?), fallback logic might be needed, 
        // but typically it returns the groupId.
        if (!groupId) {
             throw new Error('Could not join group (invalid code or already verified?)');
        }

        // Fetch Chat Info - with Retry
        let chat = null;
        const maxRetries = 20; // 20 attempts
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                console.log(`[Scraper] Fetching chat details (Attempt ${i + 1}/${maxRetries})...`);
                chat = await client.getChatById(groupId);
                
                // For large groups, ensure members are actually loaded
                if (chat && chat.participants && chat.participants.length > 0) {
                     break;
                } else {
                    console.log(`[Scraper] Chat found but members not ready yet...`);
                    chat = null; // Forces retry
                }
            } catch (e) {
                console.log(`[Scraper] Fetch attempt ${i + 1} failed: ${e.message}`);
            }
            // Wait before next retry
            await delay(3000); 
        }

        if (!chat) {
            throw new Error(`Chat ${groupId} not found. The app might still be syncing. Please try again in a moment.`);
        }

        console.log(`[Scraper] Chat Found: ${chat.name} with ${chat.participants.length} members`);

        // Extract Participants
        const members = chat.participants.map(p => {
             return {
                 phone: p.id.user,
                 isAdmin: p.isAdmin,
                 isSuperAdmin: p.isSuperAdmin
             };
        });

        return {
            name: chat.name,
            members: members,
            count: members.length
        };

    } catch (err) {
        console.error('[Scraper] Scraping failed:', err);
        throw new Error(`Scraping failed: ${err.message}`);
    }
};

const logout = async () => {
    await cleanupClient();
};

module.exports = {
    init,
    getStatus,
    scrapeGroup,
    logout
};
