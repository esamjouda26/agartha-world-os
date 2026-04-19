import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

type Duration = `${number} ${"s" | "m" | "h" | "d"}`;

export type RateLimitConfig = Readonly<{
  tokens: number;
  window: Duration;
  prefix: string;
}>;

export function createRateLimiter(config: RateLimitConfig): Ratelimit {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.tokenBucket(config.tokens, config.window, config.tokens),
    analytics: true,
    prefix: `ratelimit:${config.prefix}`,
  });
}
