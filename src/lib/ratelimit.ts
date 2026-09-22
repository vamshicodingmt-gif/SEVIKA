import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Optional rate limiting via Upstash Redis. When the environment variables are
 * absent (local dev / self-host), limits are bypassed so nothing breaks.
 */

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const limiters = {
  auth: redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "5 m"), prefix: "sevika:auth" })
    : null,
  booking: redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(12, "1 h"), prefix: "sevika:booking" })
    : null,
  message: redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(120, "1 m"), prefix: "sevika:message" })
    : null,
};

export type LimiterName = keyof typeof limiters;

export async function rateLimit(name: LimiterName, identifier: string) {
  const limiter = limiters[name];
  if (!limiter) return { success: true } as const;
  try {
    return await limiter.limit(`${name}:${identifier}`);
  } catch {
    // Never fail a request because Redis is down.
    return { success: true } as const;
  }
}
