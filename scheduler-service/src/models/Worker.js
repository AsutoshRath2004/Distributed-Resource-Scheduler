const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema(
  {
    workerId: { type: String, required: true, unique: true },
    hostname: { type: String, required: true },
    port: { type: Number, required: true },
    cpuCores: { type: Number, default: 1 },
    totalMemory: { type: Number, default: 0 }, // in MB
    cpuUsage: { type: Number, default: 0 },    // percentage 0-100
    memUsage: { type: Number, default: 0 },    // percentage 0-100
    status: {
      type: String,
      enum: ['active', 'idle', 'offline'],
      default: 'idle',
    },
    lastHeartbeat: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Worker', workerSchema);