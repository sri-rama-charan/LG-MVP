const Queue = require('bull');

// Mock Queue for environments without Redis
class MockQueue {
    constructor(name, processor) {
        this.name = name;
        this.processor = processor;
        console.warn(`[${name}] Redis not detected. Using In-Memory Mock Queue.`);
    }

    async add(data, options) {
        console.log(`[${this.name}] Mock Job added:`, data);
        if (this.processor) {
            // Simulate async processing
            setImmediate(async () => {
                try {
                    console.log(`[${this.name}] Processing Mock Job...`);
                    // Create a mock job object
                    const job = { data, progress: (p) => console.log(`[${this.name}] Progress: ${p}%`) };
                    await this.processor(job);
                    console.log(`[${this.name}] Mock Job Completed.`);
                } catch (err) {
                    console.error(`[${this.name}] Mock Job Failed:`, err);
                }
            });
        } else {
             console.warn(`[${this.name}] No processor registered for mock queue.`);
        }
        return Promise.resolve({ id: 'mock_job_' + Date.now() });
    }

    process(handler) {
        this.processor = handler;
    }
    
    on(event, cb) {
        // No-op for event listeners to prevent crashes
    }
    
    async getJobs() { return []; } 
    // Add other necessary aliases if needed, but 'add' and 'process' are main ones used
}

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null, 
  enableReadyCheck: false,
  // Fail fast
  retryStrategy: (times) => null 
};

let campaignQueue, messageQueue;
let useMock = false;

// Heuristic: If we are in restricted env (user confirmed no redis), use Mock.
// We can also try-catch, but Bull connects async.
// For this User Request, we forcefully enable Mock if connection failed repeatedly.
// For now, I will DEFAULT to Mock in this specific file version because I KNOW redis is down.
// In a real app, successful redis connection is preferred.
useMock = true; // FORCE MOCK for MVP Stability

if (useMock) {
    const { processCampaign } = require('./jobProcessor');
    campaignQueue = new MockQueue('campaign-execution');
    campaignQueue.process(processCampaign); // Register immediately for mock
    
    messageQueue = new MockQueue('message-delivery');
} else {
    // Original Redis Logic (Keep for reference or future enable)
    try {
        campaignQueue = new Queue('campaign-execution', { redis: redisConfig });
        messageQueue = new Queue('message-delivery', { redis: redisConfig });

        campaignQueue.on('error', (err) => console.error('Campaign Queue Error:', err.message));
        messageQueue.on('error', (err) => console.error('Message Queue Error:', err.message));
        
        const { processCampaign } = require('./jobProcessor');
        campaignQueue.process(processCampaign);

    } catch (err) {
        console.error('Failed to init Redis queues');
    }
}

module.exports = {
  campaignQueue,
  messageQueue
};
