const express = require('express');
const { redisClient } = require('../config/redis');

const router = express.Router();

router.get('/', async (req, res) => {
  const health = {
    service: 'worker-service',
    workerId: process.env.WORKER_ID || 'unknown',
    status: 'ok',
    timestamp: new Date().toISOString(),
    dependencies: {
      redis: 'unknown',
    },
  };

  try {
    const pong = await redisClient.ping();
    health.dependencies.redis = pong === 'PONG' ? 'connected' : 'error';
  } catch {
    health.dependencies.redis = 'disconnected';
  }

  const allHealthy = Object.values(health.dependencies).every(
    (v) => v === 'connected'
  );

  res.status(allHealthy ? 200 : 503).json(health);
});

module.exports = router;
