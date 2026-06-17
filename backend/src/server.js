const http = require('http');
const cron = require('node-cron');
const app = require('./app');
const env = require('./config/env');
const { connectDb } = require('./config/db');
const { initSockets } = require('./sockets');
const redis = require('./config/redis');

// Render's free tier sleeps the dyno after ~15 min of no inbound requests.
// Self-ping every 10 min (tighter than the timeout) to keep it warm while running.
function startKeepAlive() {
  const selfUrl = process.env.SELF_URL || `http://localhost:${env.port}`;
  cron.schedule('*/10 * * * *', () => {
    fetch(`${selfUrl}/api/health`).catch(() => {});
  });
}

async function main() {
  await connectDb();
  const pong = await redis.ping();
  console.log('Valkey:', pong);
  const server = http.createServer(app);
  initSockets(server);
  server.listen(env.port, () => console.log(`[api] listening on :${env.port}`));
  startKeepAlive();
}

main().catch((e) => {
  console.error('Fatal startup error', e);
  process.exit(1);
});
