import { defineConfig, mergeConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import viteConfig from "./vite.config";

const testSetupPath = fileURLToPath(
  new URL("./src/test-setup.ts", import.meta.url),
);

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: "@veritas/frontend",
      environment: "jsdom",
      include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      globals: true,
      css: false,
      setupFiles: [testSetupPath],
    },
  }),
);
