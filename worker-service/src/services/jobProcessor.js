const { redisClient } = require('../config/redis');
const { executeJob } = require('./jobExecutor');

const SCHEDULER_URL = process.env.SCHEDULER_URL || 'http://localhost:3001';
const WORKER_ID = process.env.WORKER_ID || 'worker-1';
const QUEUE_KEY = `worker:${WORKER_ID}:jobs`;

const reportStatus = async (jobId, status, result = null, error = null) => {
  try {
    await fetch(`${SCHEDULER_URL}/jobs/${jobId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, result, error, workerId: WORKER_ID }),
    });
  } catch (err) {
    console.error(`[Processor] Failed to report status for ${jobId}:`, err.message);
  }
};

const processNextJob = async () => {
  // BRPOP blocks up to 2s waiting for a job
  const result = await redisClient.brpop(QUEUE_KEY, 2);
  if (!result) return;

  const [, jobData] = result;
  const job = JSON.parse(jobData);

  console.log(`[Worker:${WORKER_ID}] Picked up job: ${job.jobId} (${job.jobType})`);

  // 1. Mark as running
  await reportStatus(job.jobId, 'running');

  try {
    // 2. Execute
    const result = await executeJob(job);

    // 3. Mark as completed
    await reportStatus(job.jobId, 'completed', result);
    console.log(`[Worker:${WORKER_ID}] Completed job: ${job.jobId}`);

  } catch (err) {
    // 4. Mark as failed
    console.error(`[Worker:${WORKER_ID}] Job failed: ${job.jobId} — ${err.message}`);
    await reportStatus(job.jobId, 'failed', null, err.message);
  }
};

const startJobProcessor = () => {
  console.log(`[Processor] Job processor started — listening on ${QUEUE_KEY}`);

  const loop = async () => {
    try {
      await processNextJob();
    } catch (err) {
      console.error('[Processor] Loop error:', err.message);
    }
    setImmediate(loop);
  };

  loop();
};

module.exports = { startJobProcessor };