const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('[MongoDB] Already connected, reusing connection');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options prevent deprecated warnings and set timeouts
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);

    // Log when the connection drops so we can spot issues in development
    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected');
      isConnected = false;
    });

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err.message);
    });

  } catch (error) {
    console.error('[MongoDB] Connection failed:', error.message);
    // Exit so the process manager (nodemon/pm2) can restart and retry
    process.exit(1);
  }
};

module.exports = connectDB;
