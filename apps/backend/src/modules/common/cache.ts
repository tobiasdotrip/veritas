import { Redis } from "ioredis";
import { createHash } from "node:crypto";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let redis: Redis | undefined;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    redis.on("error", (err: Error) => {
      // eslint-disable-next-line no-console
      console.error("Redis error", err);
    });
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  await redis?.quit();
  redis = undefined;
}

export function hashCacheKeyPart(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

export class CacheService {
  private redis: Redis;

  constructor(redisInstance: Redis = getRedis()) {
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
    ttlSeconds: number
  ): Promise<void> {
    const gen = await this.getGeneration(namespace);
    await this.redis.setex(
      this.cacheKey(namespace, gen, key),
      ttlSeconds,
      JSON.stringify(value)
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
    factory: () => Promise<T>
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
