require('dotenv').config();

const { redisClient } = require('./src/config/redis');
const { server } = require('./src/app');
const { startAgent } = require('./src/services/workerAgent');
const { startJobProcessor } = require('./src/services/jobProcessor');

const PORT = process.env.WORKER_PORT || 3002;
const WORKER_ID = process.env.WORKER_ID || 'worker-1';

const start = async () => {
  console.log(`=== Worker Service Starting [${WORKER_ID}] ===`);
  server.listen(PORT, () => {
    console.log(`[Worker:${WORKER_ID}] Running on port ${PORT}`);
  });
  await startAgent(); 
  startJobProcessor(); 
};

const shutdown = async (signal) => {
  console.log(`\n[Worker:${WORKER_ID}] Received ${signal}, shutting down...`);
  redisClient.disconnect();
  server.close(() => {
    console.log(`[Worker:${WORKER_ID}] HTTP server closed`);
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
