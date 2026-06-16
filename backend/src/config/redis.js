const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.VALKEY_HOST,
  port: Number(process.env.VALKEY_PORT),
  username: process.env.VALKEY_USERNAME,
  password: process.env.VALKEY_PASSWORD,
  tls: {},
});

redis.on("connect", () => {
  console.log("✅ Valkey Connected");
});

redis.on("error", (err) => {
  console.log("❌ Valkey Error", err);
});

module.exports = redis;