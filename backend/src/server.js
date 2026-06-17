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
  // MongoDB is a hard dependency — the API cannot serve without it.
  await connectDb();

  // Valkey/Redis is only a cache. A failed ping must NOT stop the server from
  // booting: every cache call falls back to MongoDB when Valkey is unreachable.
  redis.ping()
    .then((pong) => console.log('Valkey:', pong))
    .catch((e) => console.error('[valkey] unavailable at boot, continuing without cache:', e.message));

  const server = http.createServer(app);
  initSockets(server);
  server.listen(env.port, () => console.log(`[api] listening on :${env.port}`));
  startKeepAlive();
  return server;
}

let httpServer;
main()
  .then((server) => { httpServer = server; })
  .catch((e) => {
    console.error('Fatal startup error', e);
    process.exit(1);
  });

// ── Production crash-safety ──────────────────────────────────────────────
// A single unhandled async error must never take the whole process down
// silently. Log it; only exit on a truly unknown synchronous fault, and even
// then drain in-flight requests first so customers don't get hard-reset.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

function shutdown(signal) {
  console.log(`[api] ${signal} received, shutting down gracefully…`);
  const done = () => process.exit(0);
  // Stop accepting new connections, then close infra. Force-exit after 10s.
  const force = setTimeout(() => { console.error('[api] forced shutdown'); process.exit(1); }, 10000).unref();
  if (httpServer) {
    httpServer.close(() => {
      Promise.allSettled([redis.quit()]).finally(done);
    });
  } else {
    done();
  }
  return force;
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
