const Worker = require('../models/Worker');
const Job = require('../models/Job');
const { redisClient } = require('../config/redis');

const WORKER_TIMEOUT = parseInt(process.env.WORKER_TIMEOUT) || 15000;

const recoverJobsForWorker = async (workerId, io) => {
  try {
    // Find all jobs that were running or assigned to this worker
    const stuckJobs = await Job.find({
      assignedWorker: workerId,
      status: { $in: ['assigned', 'running'] },
    });

    if (!stuckJobs.length) {
      console.log(`[Monitor] No stuck jobs found for ${workerId}`);
      return;
    }

    console.log(`[Monitor] Recovering ${stuckJobs.length} stuck job(s) from ${workerId}`);

    for (const job of stuckJobs) {
      // Mark job as failed first
      await Job.findOneAndUpdate(
        { jobId: job.jobId },
        {
          status: 'failed',
          error: `Worker ${workerId} went offline`,
          completedAt: new Date(),
        }
      );

      // Re-queue it so the scheduler picks it up again
      await redisClient.lpush(
        'jobs:pending',
        JSON.stringify({
          jobId: job.jobId,
          jobType: job.jobType,
          priority: job.priority,
          payload: job.payload,
          retried: true,  // flag so we know this is a retry
        })
      );

      console.log(`[Monitor] Re-queued job ${job.jobId} (was ${job.status} on ${workerId})`);

      // Notify dashboard
      io.emit('job:requeued', {
        jobId: job.jobId,
        previousWorker: workerId,
        reason: 'worker offline',
      });
    }
  } catch (err) {
    console.error(`[Monitor] Recovery error for ${workerId}:`, err.message);
  }
};

const startWorkerMonitor = (io) => {
  console.log('[Monitor] Worker heartbeat monitor started');

  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - WORKER_TIMEOUT);

      // Find workers that haven't heartbeated within the timeout window
      const staleWorkers = await Worker.find({
        status: { $ne: 'offline' },
        lastHeartbeat: { $lt: cutoff },
      });

      for (const worker of staleWorkers) {
        console.warn(`[Monitor] Worker ${worker.workerId} missed heartbeat — marking offline`);

        // Mark offline in MongoDB
        await Worker.findOneAndUpdate(
          { workerId: worker.workerId },
          { status: 'offline' }
        );

        // Mark offline in Redis
        await redisClient.hset(`worker:${worker.workerId}`, { status: 'offline' });

        // Notify dashboard
        io.emit('worker:offline', { workerId: worker.workerId });

        // Recover any jobs that were running on this worker
        await recoverJobsForWorker(worker.workerId, io);
      }
    } catch (err) {
      console.error('[Monitor] Error checking workers:', err.message);
    }
  }, 10000);
};

module.exports = { startWorkerMonitor };