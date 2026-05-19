import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "@veritas/shared";

export async function createLoader(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  return {
    db,
    pool,
    async close() {
      await pool.end();
    },
  };
}
