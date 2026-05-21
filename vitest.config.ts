import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    reporters: ["verbose"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/db/seed.ts",
        "**/db/migrate.ts",
        "**/cli.ts",
        "**/server.ts",
        "**/*.test.ts",
      ],
    },
    projects: [
      "packages/shared",
      "packages/etl",
      "apps/backend",
      "apps/frontend",
    ],
  },
});
