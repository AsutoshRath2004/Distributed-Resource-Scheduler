const express = require('express');
const mongoose = require('mongoose');
const { redisClient } = require('../config/redis');

const router = express.Router();

// GET /health
// Returns the live status of each infrastructure dependency.
// This is the first endpoint you hit after startup to confirm everything connected.
router.get('/', async (req, res) => {
  const health = {
    service: 'scheduler-service',
    status: 'ok',
    timestamp: new Date().toISOString(),
    dependencies: {
      mongodb: 'unknown',
      redis: 'unknown',
    },
  };

  // Check MongoDB — readyState 1 means connected
  health.dependencies.mongodb =
    mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  // Check Redis — ping returns 'PONG' if healthy
  try {
    const pong = await redisClient.ping();
    health.dependencies.redis = pong === 'PONG' ? 'connected' : 'error';
  } catch (err) {
    health.dependencies.redis = 'disconnected';
  }

  // If any dependency is down, return 503 so load balancers can detect it
  const allHealthy = Object.values(health.dependencies).every(
    (v) => v === 'connected'
  );

  res.status(allHealthy ? 200 : 503).json(health);
});

module.exports = router;
