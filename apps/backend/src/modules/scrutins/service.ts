import { NotFoundError } from "../common/errors.js";
import type { ScrutinRepository } from "./repository.js";
import type { CacheService } from "../common/cache.js";
import { hashCacheKeyPart } from "../common/cache.js";
import type { CursorPaginationInput, OffsetPaginationInput } from "../common/pagination.js";
import type { ScrutinSearchFilters, ScrutinVoteFilters } from "./repository.js";

const CACHE_NS = "scrutins";
const DEFAULT_TTL = 300;

export function createScrutinService(
  repo: ScrutinRepository,
  cache: CacheService
) {
  return {
    async searchScrutins(
      legislature: string,
      filters: ScrutinSearchFilters,
      pagination: CursorPaginationInput
    ) {
      const cacheKey = `search:${legislature}:${hashCacheKeyPart(filters)}:${hashCacheKeyPart(pagination)}`;
      return cache.getOrSet(
        CACHE_NS,
        cacheKey,
        DEFAULT_TTL,
        () => repo.search(legislature, filters, pagination)
      );
    },

    async getScrutinById(id: string) {
      const cacheKey = `id:${id}`;
      const scrutin = await cache.getOrSet(CACHE_NS, cacheKey, DEFAULT_TTL, () =>
        repo.getWithDetails(id)
      );
      if (!scrutin) {
        throw new NotFoundError("Scrutin", id);
      }
      return scrutin;
    },

    async getScrutinVotes(
      scrutinId: string,
      filters: ScrutinVoteFilters,
      pagination: OffsetPaginationInput
    ) {
      const cacheKey = `votes:${scrutinId}:${hashCacheKeyPart(filters)}:${hashCacheKeyPart(pagination)}`;
      return cache.getOrSet(
        CACHE_NS,
        cacheKey,
        DEFAULT_TTL,
        () => repo.getVotes(scrutinId, filters, pagination)
      );
    },
  };
}

export type ScrutinService = ReturnType<typeof createScrutinService>;
