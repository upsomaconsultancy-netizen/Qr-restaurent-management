const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDb } = require('./config/db');
const { initSockets } = require('./sockets');

async function main() {
  await connectDb();
  const server = http.createServer(app);
  initSockets(server);
  server.listen(env.port, () => console.log(`[api] listening on :${env.port}`));
}

main().catch((e) => {
  console.error('Fatal startup error', e);
  process.exit(1);
});
