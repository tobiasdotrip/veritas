/**
 * Custom Redis store for @fastify/rate-limit using the official `redis` (v5) package.
 *
 * The built-in @fastify/rate-limit RedisStore uses ioredis + `defineCommand`.
 * Since we migrated to `redis` v5 (createClient), we provide a compatible store
 * that uses Lua scripting via the `scripts` client option.
 *
 * Usage:
 *   import { createRedisV5RateLimitStore } from "./redis-rate-limit-store.js";
 *   const Store = createRedisV5RateLimitStore(redisClient);
 *   await app.register(rateLimit, { store: Store, ... });
 */

import type { RedisClientType } from "redis";
import type { FastifyRateLimitOptions, FastifyRateLimitStore } from "@fastify/rate-limit";

// ─── Lua script (identical logic to @fastify/rate-limit's RedisStore) ──────

export const RATE_LIMIT_LUA = `
  local key = KEYS[1]
  local timeWindow = tonumber(ARGV[1])
  local max = tonumber(ARGV[2])
  local continueExceeding = ARGV[3] == 'true'
  local exponentialBackoff = ARGV[4] == 'true'
  local MAX_SAFE_INTEGER = (2^53) - 1

  local current = redis.call('INCR', key)

  if current == 1 or (continueExceeding and current > max) then
    redis.call('PEXPIRE', key, timeWindow)
  elseif exponentialBackoff and current > max then
    local backoffExponent = current - max - 1
    timeWindow = math.min(timeWindow * (2 ^ backoffExponent), MAX_SAFE_INTEGER)
    redis.call('PEXPIRE', key, timeWindow)
  else
    timeWindow = redis.call('PTTL', key)
  end

  return {current, timeWindow}
`;

// ─── Store factory ──────────────────────────────────────────────────────────

type Callback = (
  error: Error | null,
  result?: { current: number; ttl: number },
) => void;

type StoreConstructor = new (
  options: FastifyRateLimitOptions,
) => FastifyRateLimitStore;

export function createRedisV5RateLimitStore(
  redisClient: RedisClientType,
): StoreConstructor {
  const clientWithScript = redisClient as any;

  class RedisV5RateLimitStore implements FastifyRateLimitStore {
    private readonly redis: typeof clientWithScript;
    private readonly key: string;
    private readonly continueExceeding: boolean;
    private readonly exponentialBackoff: boolean;

    constructor(options: FastifyRateLimitOptions & Record<string, unknown>) {
      this.redis = clientWithScript;
      this.key = (options.nameSpace as string) ?? "fastify-rate-limit-";
      this.continueExceeding =
        (options.continueExceeding as boolean) ?? false;
      this.exponentialBackoff =
        (options.exponentialBackoff as boolean) ?? false;
    }

    incr(key: string, cb: Callback, ...args: any[]): void {
      const timeWindow: number = args[0] ?? 60000;
      const max: number = args[1] ?? 1000;
      this.redis
        .rateLimit(
          this.key + key,
          timeWindow ?? 60000,
          max ?? 1000,
          this.continueExceeding,
          this.exponentialBackoff,
        )
        .then(
          (result: [number, number]) =>
            cb(null, { current: result[0], ttl: result[1] }),
          (err: Error) => cb(err, { current: 0, ttl: timeWindow ?? 60000 }),
        );
    }

    child(routeOptions: any): FastifyRateLimitStore {
      const routeInfo = (routeOptions.routeInfo ?? {}) as {
        method?: string;
        url?: string;
      };
      const childKey = `${this.key}${routeInfo.method ?? ""}${routeInfo.url ?? ""}-`;
      return new RedisV5RateLimitStore({
        nameSpace: childKey,
        continueExceeding: this.continueExceeding,
        exponentialBackoff: this.exponentialBackoff,
      } as FastifyRateLimitOptions & Record<string, unknown>);
    }
  }

  return RedisV5RateLimitStore as unknown as StoreConstructor;
}
