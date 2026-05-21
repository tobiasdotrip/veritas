import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: "@veritas/frontend",
      environment: "jsdom",
      include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      globals: true,
      css: false,
    },
  }),
);
