import { NotFoundError } from "../common/errors.js";
import type { DeputyRepository } from "./repository.js";
import type { CacheService } from "../common/cache.js";
import { hashCacheKeyPart } from "../common/cache.js";
import type { CursorPaginationInput } from "../common/pagination.js";
import type { DeputyVoteFilters } from "./repository.js";

const CACHE_NS = "deputies";
const DEFAULT_TTL = 300; // 5 minutes

export function createDeputyService(
  repo: DeputyRepository,
  cache: CacheService
) {
  return {
    async searchDeputies(
      filters: {
        q?: string | undefined;
        department?: string | undefined;
        circo?: number | undefined;
        group?: string | undefined;
        legislature?: string | undefined;
      },
      limit: number,
      offset: number
    ) {
      const cacheKey = `search:${hashCacheKeyPart(filters)}:${limit}:${offset}`;
      return cache.getOrSet(
        CACHE_NS,
        cacheKey,
        DEFAULT_TTL,
        () => repo.search(filters, limit, offset)
      );
    },

    async getDeputyById(id: string) {
      const cacheKey = `id:${id}`;
      return cache.getOrSet(CACHE_NS, cacheKey, DEFAULT_TTL, () =>
        repo.getWithDetails(id)
      );
    },

    async getDeputyBySlug(slug: string) {
      const cacheKey = `slug:${slug}`;
      const deputy = await cache.getOrSet(CACHE_NS, cacheKey, DEFAULT_TTL, () =>
        repo.getBySlug(slug)
      );
      if (!deputy) {
        throw new NotFoundError("Deputy", slug);
      }
      return deputy;
    },

    async getDeputyVotes(
      deputyId: string,
      legislature: string,
      filters: DeputyVoteFilters,
      pagination: CursorPaginationInput
    ) {
      const cacheKey = `votes:${deputyId}:${legislature}:${hashCacheKeyPart(filters)}:${hashCacheKeyPart(pagination)}`;
      return cache.getOrSet(
        CACHE_NS,
        cacheKey,
        DEFAULT_TTL,
        () => repo.getVotes(deputyId, legislature, filters, pagination)
      );
    },

    async getDeputyStats(deputyId: string, legislature: string) {
      const cacheKey = `stats:${deputyId}:${legislature}`;
      return cache.getOrSet(CACHE_NS, cacheKey, DEFAULT_TTL, () =>
        repo.getStats(deputyId, legislature)
      );
    },
  };
}

export type DeputyService = ReturnType<typeof createDeputyService>;
