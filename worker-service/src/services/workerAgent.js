const os = require('os');

const SCHEDULER_URL = process.env.SCHEDULER_URL || 'http://localhost:3001';
const WORKER_ID = process.env.WORKER_ID || 'worker-1';
const WORKER_PORT = parseInt(process.env.WORKER_PORT) || 3002;
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL) || 5000;

let simulatedCpu = Math.floor(Math.random() * 40) + 10;
let simulatedMem = Math.floor(Math.random() * 40) + 20;

const getSimulatedMetrics = () => {
  simulatedCpu = Math.max(5, Math.min(95, simulatedCpu + (Math.random() * 10 - 5)));
  simulatedMem = Math.max(10, Math.min(90, simulatedMem + (Math.random() * 6 - 3)));
  return {
    cpuUsage: Math.round(simulatedCpu),
    memUsage: Math.round(simulatedMem),
  };
};

const register = async () => {
  try {
    const response = await fetch(`${SCHEDULER_URL}/workers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workerId: WORKER_ID,
        hostname: os.hostname(),
        port: WORKER_PORT,
        cpuCores: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024),
      }),
    });

    if (!response.ok) throw new Error(`Registration failed: ${response.status}`);
    console.log(`[Worker:${WORKER_ID}] Registered with scheduler`);
  } catch (err) {
    console.error(`[Worker:${WORKER_ID}] Registration error:`, err.message);
    console.log(`[Worker:${WORKER_ID}] Retrying registration in 5s...`);
    setTimeout(register, 5000);
  }
};

const sendHeartbeat = async () => {
  try {
    const { cpuUsage, memUsage } = getSimulatedMetrics();

    const response = await fetch(`${SCHEDULER_URL}/workers/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workerId: WORKER_ID,
        cpuUsage,
        memUsage,
        status: 'active',
      }),
    });

    if (!response.ok) throw new Error(`Heartbeat failed: ${response.status}`);
    console.log(`[Worker:${WORKER_ID}] Heartbeat — CPU: ${cpuUsage}% | MEM: ${memUsage}%`);
  } catch (err) {
    console.error(`[Worker:${WORKER_ID}] Heartbeat error:`, err.message);
  }
};

const startAgent = async () => {
  await register();
  setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  console.log(`[Worker:${WORKER_ID}] Heartbeat loop started (every ${HEARTBEAT_INTERVAL}ms)`);
};

module.exports = { startAgent };