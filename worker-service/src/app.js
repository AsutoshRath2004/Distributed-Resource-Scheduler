const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/health', require('./routes/health'));

app.get('/', (req, res) => {
  res.json({
    service: 'worker-service',
    workerId: process.env.WORKER_ID || 'unknown',
    version: '1.0.0',
  });
});

module.exports = { app, server };
