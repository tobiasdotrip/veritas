import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration("backend integration", () => {
  let app: FastifyInstance;
  let pool: Pool;
  let destroyTestApp: (app: FastifyInstance) => Promise<void>;
  let injectJson: typeof import("./test-utils/http.js").injectJson;
  let setupTestDatabase: () => Promise<Pool>;
  let teardownTestDatabase: (pool: Pool) => Promise<void>;
  let createTestApp: () => Promise<FastifyInstance>;

  beforeAll(async () => {
    const utils = await import("./test-utils/index.js");
    createTestApp = utils.createTestApp;
    destroyTestApp = utils.destroyTestApp;
    injectJson = utils.injectJson;
    setupTestDatabase = utils.setupTestDatabase;
    teardownTestDatabase = utils.teardownTestDatabase;

    pool = await setupTestDatabase();
    app = await createTestApp();
  }, 30_000);

  afterAll(async () => {
    await destroyTestApp(app);
    await teardownTestDatabase(pool);
  });

  it("GET /health returns ok", async () => {
    const response = await injectJson<{ status: string }>(app, {
      method: "GET",
      url: "/health",
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("GET /api/v1/search/suggestions returns ranked mixed results", async () => {
    const response = await injectJson<{ data: unknown[] }>(app, {
      method: "GET",
      url: "/api/v1/search/suggestions?q=martin&limit=5",
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
