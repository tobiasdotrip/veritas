import { test, expect } from "@playwright/test";

test.describe("API smoke", () => {
  test("health endpoint responds", async ({ request }) => {
    const response = await request.get("/health");
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("ok");
  });

  test("search suggestions endpoint responds", async ({ request }) => {
    const response = await request.get("/api/v1/search/suggestions?q=test&limit=5");
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBeTruthy();
  });
});

test.describe("Frontend smoke", () => {
  test.skip(
    !process.env.E2E_FRONTEND_BASE_URL,
    "Set E2E_FRONTEND_BASE_URL to run frontend smoke tests"
  );

  test("homepage loads", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Transparence des votes" })).toBeVisible();
  });
});
