const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  // Retry with exponential backoff, up to 30 seconds
  retryStrategy(times) {
    const delay = Math.min(times * 200, 30000);
    console.log(`[Redis] Reconnecting in ${delay}ms... (attempt ${times})`);
    return delay;
  },
  lazyConnect: false,
};

// Primary client — used for all get/set/list/hash commands
const redisClient = new Redis(redisConfig);

// Subscriber client — dedicated connection for pub/sub
// A connection in subscribe mode cannot run regular commands
const redisSubscriber = new Redis(redisConfig);

redisClient.on('connect', () => console.log('[Redis] Client connected'));
redisClient.on('error', (err) => console.error('[Redis] Client error:', err.message));

redisSubscriber.on('connect', () => console.log('[Redis] Subscriber connected'));
redisSubscriber.on('error', (err) => console.error('[Redis] Subscriber error:', err.message));

module.exports = { redisClient, redisSubscriber };
