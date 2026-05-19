import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://veritas:veritas_dev@localhost:5432/veritas";

let pool: Pool | undefined;
let db: ReturnType<typeof createDb> | undefined;

function createDb(client: Pool) {
  return drizzle({ client, schema });
}

export type Database = ReturnType<typeof createDb>;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      // eslint-disable-next-line no-console
      console.error("Unexpected PostgreSQL pool error", err);
    });
  }
  return pool;
}

export function getDb(): Database {
  if (!db) {
    db = createDb(getPool());
  }
  return db;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
  db = undefined;
}
