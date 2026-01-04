const Queue = require('bull');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
};

const campaignQueue = new Queue('campaign-execution', { redis: redisConfig });
const messageQueue = new Queue('message-delivery', { redis: redisConfig });

module.exports = {
  campaignQueue,
  messageQueue
};
