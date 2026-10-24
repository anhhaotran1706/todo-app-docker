const mongoose = require('mongoose');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/tododb';

// Retry until MongoDB accepts connections (it may still be starting).
async function connectWithRetry(retries = 20, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await mongoose.connect(MONGO_URL);
      console.log(`[db] connected to MongoDB (${MONGO_URL})`);
      return;
    } catch (err) {
      console.log(`[db] connection failed (${i}/${retries}): ${err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Could not connect to MongoDB');
}

module.exports = { connectWithRetry };
