const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Job = require('../models/Job');
const { redisClient } = require('../config/redis');

const router = express.Router();

// POST /jobs — submit a new job
router.post('/', async (req, res) => {
  try {
    const { jobType, priority, payload } = req.body;

    if (!jobType) {
      return res.status(400).json({ error: 'jobType is required' });
    }

    const jobId = `job-${uuidv4()}`;

    // Persist to MongoDB
    const job = await Job.create({
      jobId,
      jobType,
      priority: priority || 'normal',
      payload: payload || {},
      status: 'pending',
    });

    // Push to Redis queue — this triggers the scheduler loop
    await redisClient.lpush('jobs:pending', JSON.stringify({
      jobId,
      jobType,
      priority: job.priority,
      payload: job.payload,
    }));

    // Notify dashboard
    req.app.get('io').emit('job:created', { jobId, jobType, priority: job.priority });

    console.log(`[Scheduler] Job queued: ${jobId} (${jobType} · ${job.priority})`);
    res.status(201).json({ message: 'Job queued', job });
  } catch (err) {
    console.error('[Scheduler] Job submit error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /jobs — list all jobs (optionally filter by status)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /jobs/:jobId — get a single job
router.get('/:jobId', async (req, res) => {
  try {
    const job = await Job.findOne({ jobId: req.params.jobId });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /jobs/:jobId/status — called by workers to update job state
router.patch('/:jobId/status', async (req, res) => {
  try {
    const { status, result, error, workerId } = req.body;
    const { jobId } = req.params;

    const update = { status };
    if (result) update.result = result;
    if (error) update.error = error;
    if (status === 'running') update.startedAt = new Date();
    if (status === 'completed' || status === 'failed') update.completedAt = new Date();

    const job = await Job.findOneAndUpdate({ jobId }, update, { new: true });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Broadcast to dashboard
    req.app.get('io').emit('job:updated', { jobId, status, workerId });

    console.log(`[Scheduler] Job ${jobId} → ${status}${workerId ? ` (${workerId})` : ''}`);
    res.json({ message: 'Job status updated', job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;