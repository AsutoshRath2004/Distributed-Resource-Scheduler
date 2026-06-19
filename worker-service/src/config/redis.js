const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 30000);
    console.log(`[Redis] Worker reconnecting in ${delay}ms...`);
    return delay;
  },
};

const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => console.log('[Redis] Worker client connected'));
redisClient.on('error', (err) => console.error('[Redis] Worker error:', err.message));

module.exports = { redisClient };
