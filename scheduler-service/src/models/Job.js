const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, unique: true },
    jobType: { type: String, required: true },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal',
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    assignedWorker: { type: String, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    retried: { type: Boolean, default: false },
    retryCount: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', jobSchema);