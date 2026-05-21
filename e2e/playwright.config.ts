import { defineConfig } from "@playwright/test";

const apiBaseUrl = process.env.E2E_API_BASE_URL ?? "http://localhost:3000";
const frontendBaseUrl =
  process.env.E2E_FRONTEND_BASE_URL ?? "http://localhost:3001";

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "api-smoke",
      use: {
        baseURL: apiBaseUrl,
      },
    },
    {
      name: "frontend-smoke",
      use: {
        baseURL: frontendBaseUrl,
      },
    },
  ],
});
