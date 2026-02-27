import { getRedisClient } from "@/lib/redis";

export async function checkRateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const redis = getRedisClient();
  const nowWindow = Math.floor(Date.now() / 1000 / windowSec);
  const redisKey = `rl:${key}:${nowWindow}`;
  const current = await redis.incr(redisKey);
  if (current === 1) await redis.expire(redisKey, windowSec);
  return current <= max;
}
