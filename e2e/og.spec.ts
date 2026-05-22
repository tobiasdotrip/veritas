import { test, expect } from "@playwright/test";

test.describe("API OG images", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "api-smoke",
      "OG API tests only run in the api-smoke project",
    );
  });

  test("deputy OG endpoint returns SVG", async ({ request }) => {
    const response = await request.get("/api/v1/og/comparateur?score=42");
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("image/svg+xml");
    const body = await response.text();
    expect(body).toMatch(/^<svg/);
    expect(body.length).toBeGreaterThan(500);
  });

  test("OG comparateur rejects invalid score", async ({ request }) => {
    const response = await request.get("/api/v1/og/comparateur?score=999");
    expect(response.status()).toBe(400);
  });

  test("OG depute rejects invalid slug", async ({ request }) => {
    const response = await request.get("/api/v1/og/depute?slug=INVALID SLUG!");
    expect(response.status()).toBe(400);
  });
});
