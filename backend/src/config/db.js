const mongoose = require('mongoose');
const env = require('./env');

async function connectDb() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongoUri, {
    // Pool sizing: enough concurrency for a busy multi-tenant API without
    // exhausting Atlas connection limits. Tune maxPoolSize per instance count.
    maxPoolSize: 20,
    minPoolSize: 2,
    // Fail fast instead of hanging a request forever when the primary is
    // unreachable or a query stalls.
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    // Drop idle pooled sockets so a long-lived process doesn't accumulate them.
    maxIdleTimeMS: 60000,
  });

  console.log(`[db] connected -> ${env.mongoUri}`);

  // Surface connection lifecycle so production incidents are visible in logs
  // rather than manifesting only as silent request timeouts.
  mongoose.connection.on('error', (err) => console.error('[db] connection error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
  mongoose.connection.on('reconnected', () => console.log('[db] reconnected'));
}

module.exports = { connectDb };
