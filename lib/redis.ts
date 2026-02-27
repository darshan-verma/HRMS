import Redis from "ioredis";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL is not configured");
    redisClient = new Redis(url, { maxRetriesPerRequest: 2 });
  }
  return redisClient;
}
