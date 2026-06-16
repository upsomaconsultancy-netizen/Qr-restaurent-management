const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDb } = require('./config/db');
const { initSockets } = require('./sockets');
const redis = require('./config/redis');


async function main() {
  await connectDb();
  const pong = await redis.ping();
  console.log('Valkey:', pong);
  const server = http.createServer(app);
  initSockets(server);
  server.listen(env.port, () => console.log(`[api] listening on :${env.port}`));
}

main().catch((e) => {
  console.error('Fatal startup error', e);
  process.exit(1);
});
