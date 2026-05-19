import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ??
      "postgresql://veritas:veritas_dev@localhost:5432/veritas",
  },
  verbose: true,
  strict: true,
});
