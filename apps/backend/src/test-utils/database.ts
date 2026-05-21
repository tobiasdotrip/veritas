import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "../db/schema.js";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

export function getTestDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

export async function setupTestDatabase(): Promise<Pool> {
  const connectionString = getTestDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for integration tests");
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  await migrate(db, {
    migrationsFolder: join(backendRoot, "drizzle"),
  });

  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "unaccent"`);

  await db
    .insert(schema.legislatures)
    .values({
      id: "17",
      startDate: new Date("2024-07-18"),
      isCurrent: true,
    })
    .onConflictDoNothing();

  return pool;
}

export async function teardownTestDatabase(pool: Pool): Promise<void> {
  await pool.end();
}
