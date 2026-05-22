import { createClient, type RedisClientType } from "redis";
import { createHash } from "node:crypto";
import { RATE_LIMIT_LUA } from "./redis-rate-limit-store.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let client: RedisClientType | undefined;

export async function getRedis(): Promise<RedisClientType> {
  if (!client) {
    client = createClient({
      url: REDIS_URL,
      scripts: {
        rateLimit: {
          SCRIPT: RATE_LIMIT_LUA,
          NUMBER_OF_KEYS: 1,
          transformArguments(
            key: string,
            timeWindow: number,
            max: number,
            continueExceeding: boolean,
            exponentialBackoff: boolean,
          ): Array<string> {
            return [
              key,
              timeWindow.toString(),
              max.toString(),
              String(continueExceeding),
              String(exponentialBackoff),
            ];
          },
          transformReply(reply: [number, number]): [number, number] {
            return reply;
          },
        },
      },
    } as any);

    client.on("error", (err: Error) => {
      console.error("Redis error", err);
    });

    await client.connect();
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.destroy();
    client = undefined;
  }
}

export function hashCacheKeyPart(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 16);
}

export class CacheService {
  private redis: RedisClientType;

  constructor(redisInstance: RedisClientType) {
    this.redis = redisInstance;
  }

  private genKey(namespace: string): string {
    return `gen:${namespace}`;
  }

  private cacheKey(namespace: string, generation: string, key: string): string {
    return `cache:${namespace}:${generation}:${key}`;
  }

  async getGeneration(namespace: string): Promise<string> {
    const gen = await this.redis.get(this.genKey(namespace));
    return gen ?? "0";
  }

  async bumpGeneration(namespace: string): Promise<void> {
    await this.redis.incr(this.genKey(namespace));
  }

  async get<T>(namespace: string, key: string): Promise<T | null> {
    const gen = await this.getGeneration(namespace);
    const value = await this.redis.get(this.cacheKey(namespace, gen, key));
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(
    namespace: string,
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    const gen = await this.getGeneration(namespace);
    await this.redis.set(
      this.cacheKey(namespace, gen, key),
      JSON.stringify(value),
      { EX: ttlSeconds },
    );
  }

  async del(namespace: string, key: string): Promise<void> {
    const gen = await this.getGeneration(namespace);
    await this.redis.del(this.cacheKey(namespace, gen, key));
  }

  async invalidateNamespace(namespace: string): Promise<void> {
    await this.bumpGeneration(namespace);
  }

  async getOrSet<T>(
    namespace: string,
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    try {
      const cached = await this.get<T>(namespace, key);
      if (cached !== null) return cached;
      const value = await factory();
      await this.set(namespace, key, value, ttlSeconds).catch(() => {});
      return value;
    } catch {
      return factory();
    }
  }
}
