const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Simulate different job types taking different amounts of time
const JOB_DURATIONS = {
  'data-processing': { min: 3000, max: 8000 },
  'image-resize':    { min: 1000, max: 4000 },
  'report-generate': { min: 5000, max: 25000 },
  'email-send':      { min: 500,  max: 2000 },
  'default':         { min: 2000, max: 6000 },
};

// Simulate a 10% failure rate for realism
const FAILURE_RATE = 0.1;

const executeJob = async (job) => {
  const { min, max } = JOB_DURATIONS[job.jobType] || JOB_DURATIONS['default'];
  const duration = Math.floor(Math.random() * (max - min) + min);

  console.log(`[Executor] Running job ${job.jobId} (${job.jobType}) — estimated ${duration}ms`);

  await sleep(duration);

  // Simulate occasional failures
  if (Math.random() < FAILURE_RATE) {
    throw new Error(`Simulated failure in job ${job.jobId}`);
  }

  return {
    processedAt: new Date().toISOString(),
    duration,
    output: `${job.jobType} completed successfully`,
    workerInfo: {
      workerId: process.env.WORKER_ID,
      hostname: require('os').hostname(),
    },
  };
};

module.exports = { executeJob };