import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@veritas/backend",
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    testTimeout: 30_000,
  },
});
