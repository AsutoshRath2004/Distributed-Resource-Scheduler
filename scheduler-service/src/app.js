const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Socket.IO sits on top of the HTTP server, not Express directly.
const io = new Server(server, {
  cors: {
    origin: '*', // Tighten this in production
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: '*' })); // Allows the dashboard (different port) to call REST endpoints
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', require('./routes/health'));
app.use('/workers', require('./routes/workers'));
app.use('/jobs', require('./routes/jobs'));

// Root — quick sanity check
app.get('/', (req, res) => {
  res.json({ service: 'scheduler-service', version: '1.0.0' });
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id} — ${reason}`);
  });
});

app.set('io', io);

module.exports = { app, server, io };