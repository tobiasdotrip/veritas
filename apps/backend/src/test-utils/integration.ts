import { afterAll, beforeAll, beforeEach, describe } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import {
  createTestApp,
  destroyTestApp,
  injectJson,
  type InjectedResponse,
} from "./http.js";
import { setupTestDatabase, teardownTestDatabase } from "./database.js";
import { resetTestFixtures } from "./fixtures.js";

export const describeIntegration = process.env.DATABASE_URL
  ? describe
  : describe.skip;

export interface IntegrationContext {
  app: FastifyInstance;
  pool: Pool;
  injectJson: typeof injectJson;
}

let sharedApp: FastifyInstance | undefined;
let sharedPool: Pool | undefined;

export function useIntegrationTest(): IntegrationContext {
  const ctx = {} as IntegrationContext;

  beforeAll(async () => {
    sharedPool = await setupTestDatabase();
    sharedApp = await createTestApp();
    ctx.pool = sharedPool;
    ctx.app = sharedApp;
    ctx.injectJson = injectJson;
  }, 30_000);

  beforeEach(async () => {
    if (!sharedPool) throw new Error("Integration pool not initialized");
    await resetTestFixtures(sharedPool);
  });

  afterAll(async () => {
    if (sharedApp) await destroyTestApp(sharedApp);
    if (sharedPool) await teardownTestDatabase(sharedPool);
    sharedApp = undefined;
    sharedPool = undefined;
  });

  return ctx;
}

export type { InjectedResponse };
