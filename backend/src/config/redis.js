const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.VALKEY_HOST,
  port: Number(process.env.VALKEY_PORT),
  username: process.env.VALKEY_USERNAME,
  password: process.env.VALKEY_PASSWORD,
  tls: {},
  // ── Resilience: cache must never block or hang an API request ──
  // Cap reconnect backoff so a long outage doesn't spin forever.
  retryStrategy: (times) => Math.min(times * 200, 5000),
  // Don't queue commands while disconnected — fail fast so callers fall back
  // to MongoDB instead of piling up promises that resolve minutes later.
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
});

redis.on("connect", () => {
  console.log("✅ Valkey Connected");
});

// Without an 'error' listener, ioredis emits an unhandled 'error' event that
// can crash the process. Log and swallow — degraded cache is not a crash.
redis.on("error", (err) => {
  console.error("❌ Valkey Error:", err.message);
});

// ── Safe wrappers ─────────────────────────────────────────────────────────
// Every cache access goes through these so a Valkey outage degrades to a
// cache-miss (null) instead of throwing into the request handler.
async function safeGet(key) {
  try {
    return await redis.get(key);
  } catch (e) {
    console.error("[valkey] get failed:", e.message);
    return null;
  }
}

async function safeSetex(key, ttl, value) {
  try {
    await redis.setex(key, ttl, value);
  } catch (e) {
    console.error("[valkey] setex failed:", e.message);
  }
}

async function safeDel(key) {
  try {
    await redis.del(key);
  } catch (e) {
    console.error("[valkey] del failed:", e.message);
  }
}

redis.safeGet = safeGet;
redis.safeSetex = safeSetex;
redis.safeDel = safeDel;

module.exports = redis;