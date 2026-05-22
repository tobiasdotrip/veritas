import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import * as schema from "../../db/schema.js";
import { createCompareRepository } from "./repository.js";
import {
  describeIntegration,
  FIXTURE,
  resetTestFixtures,
  setupTestDatabase,
  teardownTestDatabase,
} from "../../test-utils/index.js";

describeIntegration("CompareRepository", () => {
  let pool: Pool;
  let repo: ReturnType<typeof createCompareRepository>;

  beforeAll(async () => {
    pool = await setupTestDatabase();
    repo = createCompareRepository(drizzle(pool, { schema }));
  }, 30_000);

  beforeEach(async () => {
    await resetTestFixtures(pool);
  });

  afterAll(async () => {
    await teardownTestDatabase(pool);
  });

  it("getCommonVotes excludes scrutins where a deputy did not vote", async () => {
    const rows = await repo.getCommonVotes(
      [FIXTURE.deputies.dupont.id, FIXTURE.deputies.martin.id],
      FIXTURE.legislatureId,
    );

    const scrutinIds = [...new Set(rows.map((r) => r.scrutinId))];

    expect(scrutinIds).toContain(FIXTURE.scrutins.sante.id);
    expect(scrutinIds).toContain(FIXTURE.scrutins.budget.id);
    expect(scrutinIds).not.toContain(FIXTURE.scrutins.motion.id);
  });

  it("getCommonVotes filters by date range", async () => {
    const rows = await repo.getCommonVotes(
      [FIXTURE.deputies.dupont.id, FIXTURE.deputies.martin.id],
      FIXTURE.legislatureId,
      "2024-09-15",
      "2024-10-31",
    );

    const scrutinIds = [...new Set(rows.map((r) => r.scrutinId))];

    expect(scrutinIds).toEqual([FIXTURE.scrutins.sante.id]);
  });

  it("getCommonVotes returns vote positions for each deputy", async () => {
    const rows = await repo.getCommonVotes(
      [FIXTURE.deputies.dupont.id, FIXTURE.deputies.martin.id],
      FIXTURE.legislatureId,
    );

    const budgetVotes = rows.filter(
      (r) => r.scrutinId === FIXTURE.scrutins.budget.id,
    );
    const positions = budgetVotes.map((r) => r.position).sort();

    expect(positions).toEqual(["contre", "pour"]);
  });

  it("getDeputiesBrief returns matching deputies", async () => {
    const rows = await repo.getDeputiesBrief([
      FIXTURE.deputies.dupont.id,
      FIXTURE.deputies.martin.id,
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.map((d) => d.slug).sort()).toEqual(
      [FIXTURE.deputies.dupont.slug, FIXTURE.deputies.martin.slug].sort(),
    );
  });
});
