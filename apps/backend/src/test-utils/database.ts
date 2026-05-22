import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";
import { Pool as PgPool } from "pg";
import * as schema from "../db/schema.js";
import { resetTestFixtures } from "./fixtures.js";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

let migratePromise: Promise<void> | undefined;

export function getTestDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

async function ensureMigrated(db: ReturnType<typeof drizzle>): Promise<void> {
  if (!migratePromise) {
    migratePromise = (async () => {
      await migrate(db, {
        migrationsFolder: join(backendRoot, "drizzle"),
      });
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "unaccent"`);
    })();
  }
  await migratePromise;
}

export async function setupTestDatabase(): Promise<Pool> {
  const connectionString = getTestDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for integration tests");
  }

  const pool = new PgPool({ connectionString });
  const db = drizzle(pool, { schema });

  await ensureMigrated(db);
  await resetTestFixtures(pool);

  return pool;
}

export async function teardownTestDatabase(pool: Pool): Promise<void> {
  await pool.end();
}
