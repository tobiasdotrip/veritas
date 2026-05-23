import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import * as schema from "../../db/schema.js";
import { createScrutinRepository } from "./repository.js";
import {
  describeIntegration,
  FIXTURE,
  resetTestFixtures,
  setupTestDatabase,
  teardownTestDatabase,
} from "../../test-utils/index.js";

describeIntegration("ScrutinRepository", () => {
  let pool: Pool;
  let repo: ReturnType<typeof createScrutinRepository>;

  beforeAll(async () => {
    pool = await setupTestDatabase();
    repo = createScrutinRepository(drizzle(pool, { schema }));
  }, 30_000);

  beforeEach(async () => {
    await resetTestFixtures(pool);
  });

  afterAll(async () => {
    await teardownTestDatabase(pool);
  });

  it("search paginates scrutins by date descending", async () => {
    const first = await repo.search(
      FIXTURE.legislatureId,
      {},
      { limit: 2, cursor: undefined },
    );

    expect(first.data).toHaveLength(2);
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).toBeTruthy();

    const second = await repo.search(
      FIXTURE.legislatureId,
      {},
      { limit: 2, cursor: first.nextCursor! },
    );

    expect(second.data).toHaveLength(1);
    expect(second.hasMore).toBe(false);
  });

  it("search filters by theme slug", async () => {
    const result = await repo.search(
      FIXTURE.legislatureId,
      { theme: FIXTURE.theme.slug },
      { limit: 20, cursor: undefined },
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe(FIXTURE.scrutins.sante.id);
  });

  it("search filters by text query", async () => {
    const result = await repo.search(
      FIXTURE.legislatureId,
      { q: "finances" },
      { limit: 20, cursor: undefined },
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe(FIXTURE.scrutins.budget.id);
  });

  it("search filters by date range", async () => {
    const result = await repo.search(
      FIXTURE.legislatureId,
      { from: "2024-09-01", to: "2024-10-31" },
      { limit: 20, cursor: undefined },
    );

    expect(result.data).toHaveLength(2);
    expect(result.data.map((s) => s.id).sort()).toEqual(
      [FIXTURE.scrutins.sante.id, FIXTURE.scrutins.budget.id].sort(),
    );
  });

  it("getById returns the matching scrutin", async () => {
    const scrutin = await repo.getById(FIXTURE.scrutins.budget.id);

    expect(scrutin?.numero).toBe(FIXTURE.scrutins.budget.numero);
  });

  it("getById returns null for unknown id", async () => {
    const scrutin = await repo.getById("VT_UNKNOWN");

    expect(scrutin).toBeNull();
  });

  it("getWithDetails includes themes and group votes", async () => {
    const scrutin = await repo.getWithDetails(FIXTURE.scrutins.sante.id);

    expect(scrutin?.themes.some((t) => t.slug === FIXTURE.theme.slug)).toBe(
      true,
    );
    expect(scrutin?.groupVotes).toHaveLength(1);
    expect(scrutin?.groupVotes[0]!.abbreviation).toBe(
      FIXTURE.group.abbreviation,
    );
  });

  it("getVotes returns individual votes with total count", async () => {
    const result = await repo.getVotes(
      FIXTURE.scrutins.sante.id,
      {},
      { limit: 10, offset: 0 },
    );

    expect(result.total).toBe(3);
    expect(result.rows).toHaveLength(3);
    expect(result.rows.map((r) => r.deputySlug).sort()).toEqual(
      [
        FIXTURE.deputies.dupont.slug,
        FIXTURE.deputies.martin.slug,
        FIXTURE.deputies.blanc.slug,
      ].sort(),
    );
  });

  it("getVotes filters by position", async () => {
    const result = await repo.getVotes(
      FIXTURE.scrutins.budget.id,
      { position: "contre" },
      { limit: 10, offset: 0 },
    );

    expect(result.total).toBe(2);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.deputySlug).sort()).toEqual(
      [FIXTURE.deputies.martin.slug, FIXTURE.deputies.blanc.slug].sort(),
    );
    expect(result.rows.every((r) => r.position === "contre")).toBe(true);
  });
});
