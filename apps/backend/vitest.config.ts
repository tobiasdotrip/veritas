import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@veritas/backend",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
