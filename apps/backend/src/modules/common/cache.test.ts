import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RedisClientType } from "redis";
import { CacheService } from "./cache.js";

function createMockRedis(): RedisClientType & {
  store: Map<string, string>;
} {
  const store = new Map<string, string>();

  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(
      async (key: string, value: string, _options?: { EX?: number }) => {
        store.set(key, value);
        return "OK";
      },
    ),
    del: vi.fn(async (key: string) => {
      const existed = store.has(key);
      store.delete(key);
      return existed ? 1 : 0;
    }),
    incr: vi.fn(async (key: string) => {
      const next = Number(store.get(key) ?? "0") + 1;
      store.set(key, String(next));
      return next;
    }),
  } as unknown as RedisClientType & { store: Map<string, string> };
}

describe("CacheService", () => {
  let redis: ReturnType<typeof createMockRedis>;
  let cache: CacheService;

  beforeEach(() => {
    redis = createMockRedis();
    cache = new CacheService(redis);
  });

  describe("getGeneration / bumpGeneration", () => {
    it("returns '0' when no generation key exists", async () => {
      expect(await cache.getGeneration("deputies")).toBe("0");
    });

    it("returns stored generation after bump", async () => {
      await cache.bumpGeneration("deputies");
      expect(await cache.getGeneration("deputies")).toBe("1");
    });

    it("increments generation on each bump", async () => {
      await cache.bumpGeneration("deputies");
      await cache.bumpGeneration("deputies");
      expect(await cache.getGeneration("deputies")).toBe("2");
    });
  });

  describe("get / set / del", () => {
    it("stores and retrieves a JSON-serializable value", async () => {
      await cache.set("deputies", "list:17", { ids: ["PA1"] }, 300);
      const result = await cache.get<{ ids: string[] }>("deputies", "list:17");
      expect(result).toEqual({ ids: ["PA1"] });
    });

    it("returns null for missing key", async () => {
      expect(await cache.get("deputies", "missing")).toBeNull();
    });

    it("returns null for invalid JSON in cache", async () => {
      redis.store.set("cache:deputies:0:bad", "not-json");
      expect(await cache.get("deputies", "bad")).toBeNull();
    });

    it("deletes a cached entry", async () => {
      await cache.set("deputies", "key1", "value", 300);
      await cache.del("deputies", "key1");
      expect(await cache.get("deputies", "key1")).toBeNull();
    });

    it("uses generation-scoped cache keys", async () => {
      await cache.set("deputies", "key1", "v1", 300);
      expect(redis.store.has("cache:deputies:0:key1")).toBe(true);
    });
  });

  describe("invalidateNamespace", () => {
    it("bumps generation so old entries are no longer read", async () => {
      await cache.set("deputies", "key1", "old-value", 300);
      await cache.invalidateNamespace("deputies");
      await cache.set("deputies", "key1", "new-value", 300);

      expect(redis.store.has("cache:deputies:0:key1")).toBe(true);
      expect(redis.store.has("cache:deputies:1:key1")).toBe(true);

      const result = await cache.get("deputies", "key1");
      expect(result).toBe("new-value");
    });
  });

  describe("getOrSet", () => {
    it("returns cached value without calling factory", async () => {
      await cache.set("compare", "PA1,PA2", { rate: 80 }, 300);
      const factory = vi.fn().mockResolvedValue({ rate: 50 });

      const result = await cache.getOrSet("compare", "PA1,PA2", 300, factory);

      expect(result).toEqual({ rate: 80 });
      expect(factory).not.toHaveBeenCalled();
    });

    it("calls factory and caches result on miss", async () => {
      const factory = vi.fn().mockResolvedValue({ rate: 75 });

      const result = await cache.getOrSet("compare", "PA1,PA2", 300, factory);

      expect(result).toEqual({ rate: 75 });
      expect(factory).toHaveBeenCalledOnce();
      expect(await cache.get("compare", "PA1,PA2")).toEqual({ rate: 75 });
    });

    it("returns factory result when Redis get fails", async () => {
      redis.get.mockRejectedValueOnce(new Error("Redis unavailable"));
      const factory = vi.fn().mockResolvedValue({ rate: 60 });

      const result = await cache.getOrSet("compare", "PA1,PA2", 300, factory);

      expect(result).toEqual({ rate: 60 });
      expect(factory).toHaveBeenCalledOnce();
    });

    it("returns factory result when Redis set fails after miss", async () => {
      redis.set.mockRejectedValueOnce(new Error("Redis write failed"));
      const factory = vi.fn().mockResolvedValue({ rate: 55 });

      const result = await cache.getOrSet("compare", "PA1,PA2", 300, factory);

      expect(result).toEqual({ rate: 55 });
    });
  });
});
