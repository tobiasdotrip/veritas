import { describe, it, expect, vi } from "vitest";
import { createCompareService } from "./service.js";
import { ValidationError } from "../common/errors.js";
import type { CompareRepository } from "./repository.js";
import type { CacheService } from "../common/cache.js";

function createMockRepo(partial: Partial<CompareRepository> = {}): CompareRepository {
  return {
    getCommonVotes: vi.fn().mockResolvedValue([]),
    getDeputiesBrief: vi.fn().mockResolvedValue([]),
    ...partial,
  };
}

function createMockCache(): CacheService {
  return {
    getGeneration: vi.fn().mockResolvedValue("0"),
    bumpGeneration: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    invalidateNamespace: vi.fn().mockResolvedValue(undefined),
    getOrSet: vi.fn().mockImplementation(async (_ns, _key, _ttl, factory) => factory()),
  } as unknown as CacheService;
}

describe("createCompareService.compareDeputies", () => {
  it("throws ValidationError with fewer than 2 deputies", async () => {
    const service = createCompareService(createMockRepo(), createMockCache());
    await expect(service.compareDeputies(["PA1"], "17")).rejects.toThrow(
      ValidationError
    );
  });

  it("throws ValidationError with more than 5 deputies", async () => {
    const service = createCompareService(createMockRepo(), createMockCache());
    await expect(
      service.compareDeputies(["PA1", "PA2", "PA3", "PA4", "PA5", "PA6"], "17")
    ).rejects.toThrow(ValidationError);
  });

  it("returns empty result when no common votes", async () => {
    const repo = createMockRepo({
      getCommonVotes: vi.fn().mockResolvedValue([]),
      getDeputiesBrief: vi.fn().mockResolvedValue([
        { id: "PA1", firstName: "Jean", lastName: "Dupont", slug: "jean-dupont", photoUrl: null },
        { id: "PA2", firstName: "Marie", lastName: "Durand", slug: "marie-durand", photoUrl: null },
      ]),
    });
    const service = createCompareService(repo, createMockCache());
    const result = await service.compareDeputies(["PA1", "PA2"], "17");

    expect(result.deputies).toHaveLength(2);
    expect(result.totalCommonVotes).toBe(0);
    expect(result.identicalVotes).toBe(0);
    expect(result.concordanceRate).toBe(0);
    expect(result.divergences).toEqual([]);
    expect(result.pairwise).toHaveLength(1);
    expect(result.pairwise[0]!.concordanceRate).toBe(0);
  });

  it("calculates 100% concordance when all votes are identical", async () => {
    const repo = createMockRepo({
      getCommonVotes: vi.fn().mockResolvedValue([
        {
          scrutinId: "S1",
          numero: 1,
          dateScrutin: new Date("2024-01-01"),
          titre: "Vote A",
          sortCode: "adopté" as const,
          deputyId: "PA1",
          deputyFirstName: "Jean",
          deputyLastName: "Dupont",
          deputySlug: "jean-dupont",
          groupAbbreviation: "LFI",
          position: "pour" as const,
        },
        {
          scrutinId: "S1",
          numero: 1,
          dateScrutin: new Date("2024-01-01"),
          titre: "Vote A",
          sortCode: "adopté" as const,
          deputyId: "PA2",
          deputyFirstName: "Marie",
          deputyLastName: "Durand",
          deputySlug: "marie-durand",
          groupAbbreviation: "LFI",
          position: "pour" as const,
        },
      ]),
      getDeputiesBrief: vi.fn().mockResolvedValue([
        { id: "PA1", firstName: "Jean", lastName: "Dupont", slug: "jean-dupont", photoUrl: null },
        { id: "PA2", firstName: "Marie", lastName: "Durand", slug: "marie-durand", photoUrl: null },
      ]),
    });
    const service = createCompareService(repo, createMockCache());
    const result = await service.compareDeputies(["PA1", "PA2"], "17");

    expect(result.totalCommonVotes).toBe(1);
    expect(result.identicalVotes).toBe(1);
    expect(result.concordanceRate).toBe(100);
    expect(result.divergences).toHaveLength(0);
    expect(result.pairwise[0]!.concordanceRate).toBe(100);
    expect(result.pairwise[0]!.identicalVotes).toBe(1);
  });

  it("detects divergences correctly", async () => {
    const repo = createMockRepo({
      getCommonVotes: vi.fn().mockResolvedValue([
        {
          scrutinId: "S1",
          numero: 1,
          dateScrutin: new Date("2024-01-01"),
          titre: "Vote A",
          sortCode: "adopté" as const,
          deputyId: "PA1",
          deputyFirstName: "Jean",
          deputyLastName: "Dupont",
          deputySlug: "jean-dupont",
          groupAbbreviation: "LFI",
          position: "pour" as const,
        },
        {
          scrutinId: "S1",
          numero: 1,
          dateScrutin: new Date("2024-01-01"),
          titre: "Vote A",
          sortCode: "adopté" as const,
          deputyId: "PA2",
          deputyFirstName: "Marie",
          deputyLastName: "Durand",
          deputySlug: "marie-durand",
          groupAbbreviation: "REN",
          position: "contre" as const,
        },
      ]),
      getDeputiesBrief: vi.fn().mockResolvedValue([
        { id: "PA1", firstName: "Jean", lastName: "Dupont", slug: "jean-dupont", photoUrl: null },
        { id: "PA2", firstName: "Marie", lastName: "Durand", slug: "marie-durand", photoUrl: null },
      ]),
    });
    const service = createCompareService(repo, createMockCache());
    const result = await service.compareDeputies(["PA1", "PA2"], "17");

    expect(result.totalCommonVotes).toBe(1);
    expect(result.identicalVotes).toBe(0);
    expect(result.concordanceRate).toBe(0);
    expect(result.divergences).toHaveLength(1);
    expect(result.divergences[0]!.positions).toHaveLength(2);
    expect(result.divergences[0]!.positions.map((p) => p.position)).toContain("pour");
    expect(result.divergences[0]!.positions.map((p) => p.position)).toContain("contre");
  });

  it("computes pairwise concordance for 3 deputies", async () => {
    const repo = createMockRepo({
      getCommonVotes: vi.fn().mockResolvedValue([
        // S1: PA1=pour, PA2=pour, PA3=contre
        {
          scrutinId: "S1",
          numero: 1,
          dateScrutin: new Date("2024-01-01"),
          titre: "Vote A",
          sortCode: "adopté" as const,
          deputyId: "PA1",
          deputyFirstName: "A",
          deputyLastName: "A",
          deputySlug: "a",
          groupAbbreviation: "LFI",
          position: "pour" as const,
        },
        {
          scrutinId: "S1",
          numero: 1,
          dateScrutin: new Date("2024-01-01"),
          titre: "Vote A",
          sortCode: "adopté" as const,
          deputyId: "PA2",
          deputyFirstName: "B",
          deputyLastName: "B",
          deputySlug: "b",
          groupAbbreviation: "LFI",
          position: "pour" as const,
        },
        {
          scrutinId: "S1",
          numero: 1,
          dateScrutin: new Date("2024-01-01"),
          titre: "Vote A",
          sortCode: "adopté" as const,
          deputyId: "PA3",
          deputyFirstName: "C",
          deputyLastName: "C",
          deputySlug: "c",
          groupAbbreviation: "REN",
          position: "contre" as const,
        },
      ]),
      getDeputiesBrief: vi.fn().mockResolvedValue([
        { id: "PA1", firstName: "A", lastName: "A", slug: "a", photoUrl: null },
        { id: "PA2", firstName: "B", lastName: "B", slug: "b", photoUrl: null },
        { id: "PA3", firstName: "C", lastName: "C", slug: "c", photoUrl: null },
      ]),
    });
    const service = createCompareService(repo, createMockCache());
    const result = await service.compareDeputies(["PA1", "PA2", "PA3"], "17");

    // 3 deputies = 3 pairwise combinations
    expect(result.pairwise).toHaveLength(3);

    const pa1pa2 = result.pairwise.find((p) => p.deputyAId === "PA1" && p.deputyBId === "PA2");
    expect(pa1pa2!.concordanceRate).toBe(100); // both "pour"

    const pa1pa3 = result.pairwise.find((p) => p.deputyAId === "PA1" && p.deputyBId === "PA3");
    expect(pa1pa3!.concordanceRate).toBe(0); // "pour" vs "contre"

    const pa2pa3 = result.pairwise.find((p) => p.deputyAId === "PA2" && p.deputyBId === "PA3");
    expect(pa2pa3!.concordanceRate).toBe(0); // "pour" vs "contre"
  });

  it("passes date filters to repository", async () => {
    const getCommonVotes = vi.fn().mockResolvedValue([]);
    const getDeputiesBrief = vi.fn().mockResolvedValue([]);
    const repo = createMockRepo({ getCommonVotes, getDeputiesBrief });
    const service = createCompareService(repo, createMockCache());

    await service.compareDeputies(["PA1", "PA2"], "17", "2024-01-01", "2024-12-31");

    expect(getCommonVotes).toHaveBeenCalledWith(
      ["PA1", "PA2"],
      "17",
      "2024-01-01",
      "2024-12-31"
    );
  });

  it("caches result with sorted deputy IDs", async () => {
    const getOrSet = vi
      .fn()
      .mockImplementation(async (_ns, _key, _ttl, factory) => factory());
    const cache = createMockCache();
    cache.getOrSet = getOrSet;

    const repo = createMockRepo({
      getCommonVotes: vi.fn().mockResolvedValue([]),
      getDeputiesBrief: vi.fn().mockResolvedValue([]),
    });
    const service = createCompareService(repo, cache);

    await service.compareDeputies(["PA2", "PA1"], "17"); // intentionally unsorted

    expect(getOrSet).toHaveBeenCalledTimes(1);
    const [, cacheKey] = getOrSet.mock.calls[0]!;
    expect(cacheKey).toContain("PA1,PA2"); // sorted
    expect(cacheKey).not.toContain("PA2,PA1");
  });
});
