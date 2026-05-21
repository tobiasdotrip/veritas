import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@veritas/shared",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
