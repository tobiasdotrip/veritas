import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@veritas/backend:integration",
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
