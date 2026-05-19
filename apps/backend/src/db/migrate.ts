import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, closeDb } from "./client.js";

async function main() {
  const db = getDb();

  console.log("⏳ Running migrations...");

  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("✅ Migrations completed");

  await closeDb();
}

main().catch((err) => {
  console.error("❌ Migration failed", err);
  process.exit(1);
});
