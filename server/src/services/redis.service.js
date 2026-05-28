const Redis = require("ioredis");
const { REDIS_URL } = require("../config/env");

let redis;

if (REDIS_URL) {
  redis = new Redis(REDIS_URL);
} else {
  console.log("⚠️ Redis not configured");
}

module.exports = redis;
