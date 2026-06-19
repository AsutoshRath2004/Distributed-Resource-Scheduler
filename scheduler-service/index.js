require('dotenv').config();

const connectDB = require('./src/config/db');
const { redisClient } = require('./src/config/redis');
const { server, io } = require('./src/app');
const { startWorkerMonitor } = require('./src/services/workerMonitor');
const { startSchedulerLoop } = require('./src/services/schedulerEngine');

const PORT = process.env.SCHEDULER_PORT || 3001;

const start = async () => {
  console.log('=== Scheduler Service Starting ===');

  // 1. Connect to MongoDB first — models depend on this
  await connectDB();

  // 2. Redis connects automatically via ioredis (lazyConnect: false)
  //    We just wait for the 'connect' event already logged in redis.js

  // 3. Start HTTP server

  server.listen(PORT, () => {
    console.log(`[Scheduler] HTTP server running on port ${PORT}`);
    startWorkerMonitor(io); 
    startSchedulerLoop(); 
    console.log('=== Scheduler Service Ready ===');
  });
};

// Graceful shutdown — close connections cleanly on SIGTERM/SIGINT
const shutdown = async (signal) => {
  console.log(`\n[Scheduler] Received ${signal}, shutting down gracefully...`);
  try {
    redisClient.disconnect();
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    server.close(() => {
      console.log('[Scheduler] HTTP server closed');
      process.exit(0);
    });
  } catch (err) {
    console.error('[Scheduler] Error during shutdown:', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
