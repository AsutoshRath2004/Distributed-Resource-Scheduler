const express = require('express');
const Worker = require('../models/Worker');
const { redisClient } = require('../config/redis');

const router = express.Router();

// POST /workers/register
// Called once by a worker on startup
router.post('/register', async (req, res) => {
  try {
    const { workerId, hostname, port, cpuCores, totalMemory } = req.body;

    if (!workerId || !hostname || !port) {
      return res.status(400).json({ error: 'workerId, hostname, port are required' });
    }

    // Upsert — if the worker restarts, update its record instead of duplicating
    const worker = await Worker.findOneAndUpdate(
      { workerId },
      { workerId, hostname, port, cpuCores, totalMemory, status: 'idle', lastHeartbeat: new Date() },
      { upsert: true, new: true }
    );

    // Also cache in Redis for fast scheduler lookups
    await redisClient.hset(`worker:${workerId}`, {
      workerId,
      hostname,
      port,
      cpuCores: cpuCores || 1,
      totalMemory: totalMemory || 0,
      cpuUsage: 0,
      memUsage: 0,
      status: 'idle',
      lastHeartbeat: Date.now(),
    });

    // Notify dashboard via Socket.IO
    req.app.get('io').emit('worker:registered', { workerId, hostname, port });

    console.log(`[Scheduler] Worker registered: ${workerId} @ ${hostname}:${port}`);
    res.status(201).json({ message: 'Worker registered', worker });
  } catch (err) {
    console.error('[Scheduler] Register error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /workers/heartbeat
// Called every HEARTBEAT_INTERVAL ms by each worker
router.post('/heartbeat', async (req, res) => {
  try {
    const { workerId, cpuUsage, memUsage, status } = req.body;

    if (!workerId) {
      return res.status(400).json({ error: 'workerId is required' });
    }

    const now = new Date();

    // Update MongoDB (non-blocking, fire and forget is fine here)
    Worker.findOneAndUpdate(
      { workerId },
      { cpuUsage, memUsage, status: status || 'active', lastHeartbeat: now },
      { new: true }
    ).catch(err => console.error('[Scheduler] Heartbeat DB error:', err.message));

    // Update Redis — this is what the scheduler reads for fast decisions
    await redisClient.hset(`worker:${workerId}`, {
      cpuUsage: cpuUsage || 0,
      memUsage: memUsage || 0,
      status: status || 'active',
      lastHeartbeat: Date.now(),
    });

    // Broadcast live update to dashboard
    req.app.get('io').emit('worker:heartbeat', { workerId, cpuUsage, memUsage, status });

    res.json({ message: 'Heartbeat received', workerId, timestamp: now });
  } catch (err) {
    console.error('[Scheduler] Heartbeat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /workers
// Returns all workers with their current status
router.get('/', async (req, res) => {
  try {
    const workers = await Worker.find().sort({ createdAt: -1 });
    res.json(workers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;