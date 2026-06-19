const { redisClient } = require('../config/redis');
const Job = require('../models/Job');
const Worker = require('../models/Worker');

// Score a worker based on available resources.
// Higher score = more available = better candidate.
// CPU availability is weighted more (0.6) than memory (0.4)
// because CPU is usually the bottleneck for compute tasks.
const scoreWorker = (worker) => {
  const cpuAvail = 100 - parseFloat(worker.cpuUsage || 0);
  const memAvail = 100 - parseFloat(worker.memUsage || 0);
  return cpuAvail * 0.6 + memAvail * 0.4;
};

const selectBestWorker = async () => {
  // Get all worker keys from Redis
  const keys = await redisClient.keys('worker:*');
  // Filter out job-queue keys like "worker:worker-1:jobs"
  const workerKeys = keys.filter(k => k.split(':').length === 2);

  if (!workerKeys.length) return null;

  const candidates = [];

  for (const key of workerKeys) {
    const worker = await redisClient.hgetall(key);
    if (!worker || !worker.workerId) continue;

    // Only consider active/idle workers
    if (worker.status !== 'active' && worker.status !== 'idle') continue;

    // Skip workers whose heartbeat is stale
    const lastBeat = parseInt(worker.lastHeartbeat || 0);
    const timeout = parseInt(process.env.WORKER_TIMEOUT) || 15000;
    if (Date.now() - lastBeat > timeout) continue;

    candidates.push({ ...worker, score: scoreWorker(worker) });
  }

  if (!candidates.length) return null;

  // Sort descending by score — highest available resources wins
  candidates.sort((a, b) => b.score - a.score);

  console.log('[Scheduler] Worker scores:');
  candidates.forEach(w =>
    console.log(`  ${w.workerId} — CPU: ${w.cpuUsage}% | MEM: ${w.memUsage}% | score: ${w.score.toFixed(1)}`)
  );

  return candidates[0];
};

const assignJob = async (job, worker) => {
  const update = {
    status: 'assigned',
    assignedWorker: worker.workerId,
  };

  // If this is a retry (job came back from a failed/offline worker),
  // increment the retry counter and clear any previous error message
  if (job.retried) {
    update.$inc = { retryCount: 1 };
    update.error = null;
  }

  await Job.findOneAndUpdate({ jobId: job.jobId }, update);

  // Push the job to the worker's personal queue in Redis
  await redisClient.lpush(
    `worker:${worker.workerId}:jobs`,
    JSON.stringify(job)
  );

  console.log(
    `[Scheduler] Job ${job.jobId} assigned to ${worker.workerId} (score: ${worker.score.toFixed(1)})${job.retried ? ' [RETRY]' : ''}`
  );
};

const processNextJob = async () => {
  // BRPOP blocks until a job is available (1s timeout)
  const result = await redisClient.brpop('jobs:pending', 1);
  if (!result) return;

  const [, jobData] = result;
  const job = JSON.parse(jobData);

  console.log(`[Scheduler] Processing job: ${job.jobId} (${job.jobType})`);

  const worker = await selectBestWorker();

  if (!worker) {
    console.warn('[Scheduler] No available workers — re-queuing job');
    await redisClient.lpush('jobs:pending', jobData);
    return;
  }

  await assignJob(job, worker);
};

// Continuous loop — always waiting for the next job
const startSchedulerLoop = () => {
  console.log('[Scheduler] Scheduler loop started');

  const loop = async () => {
    try {
      await processNextJob();
    } catch (err) {
      console.error('[Scheduler] Loop error:', err.message);
    }
    setImmediate(loop);
  };

  loop();
};

module.exports = { startSchedulerLoop, selectBestWorker };