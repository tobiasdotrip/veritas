import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@veritas/etl",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
