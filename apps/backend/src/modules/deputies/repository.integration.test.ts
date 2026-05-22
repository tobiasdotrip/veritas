import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import * as schema from "../../db/schema.js";
import { createDeputyRepository } from "./repository.js";
import {
  describeIntegration,
  FIXTURE,
  resetTestFixtures,
  setupTestDatabase,
  teardownTestDatabase,
} from "../../test-utils/index.js";

describeIntegration("DeputyRepository", () => {
  let pool: Pool;
  let repo: ReturnType<typeof createDeputyRepository>;

  beforeAll(async () => {
    pool = await setupTestDatabase();
    repo = createDeputyRepository(drizzle(pool, { schema }));
  }, 30_000);

  beforeEach(async () => {
    await resetTestFixtures(pool);
  });

  afterAll(async () => {
    await teardownTestDatabase(pool);
  });

  it("search finds deputies by name query", async () => {
    const result = await repo.search({ q: "Dupont" }, 10, 0);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.slug).toBe(FIXTURE.deputies.dupont.slug);
    expect(result.total).toBe(1);
  });

  it("getBySlug returns the matching deputy", async () => {
    const deputy = await repo.getBySlug(FIXTURE.deputies.martin.slug);

    expect(deputy?.id).toBe(FIXTURE.deputies.martin.id);
  });

  it("getStats computes participation and loyalty rates", async () => {
    const stats = await repo.getStats(
      FIXTURE.deputies.dupont.id,
      FIXTURE.legislatureId,
    );

    expect(stats.totalScrutins).toBe(3);
    expect(stats.votesCast).toBe(3);
    expect(stats.participationRate).toBe(100);
    expect(stats.votesWithGroup).toBe(2);
    expect(stats.loyaltyRate).toBeCloseTo(66.67, 1);
  });

  it("getVotes filters by theme slug", async () => {
    const result = await repo.getVotes(
      FIXTURE.deputies.dupont.id,
      FIXTURE.legislatureId,
      { theme: FIXTURE.theme.slug },
      { limit: 10 },
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.scrutinId).toBe(FIXTURE.scrutins.sante.id);
  });

  it("getWithDetails includes current group affiliation", async () => {
    const deputy = await repo.getWithDetails(FIXTURE.deputies.dupont.id);

    expect(deputy?.currentGroup?.abbreviation).toBe(FIXTURE.group.abbreviation);
    expect(deputy?.mandates.length).toBeGreaterThan(0);
  });
});
