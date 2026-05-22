import { test, expect } from "@playwright/test";

test.describe("API themes & search", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "api-smoke",
      "API theme tests only run in the api-smoke project",
    );
  });

  test("themes endpoint responds with data array", async ({ request }) => {
    const response = await request.get("/api/v1/themes?legislature=17");
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as {
      data: { slug: string; label: string; scrutinsCount: number }[];
    };
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test("search by theme responds without text query", async ({ request }) => {
    const response = await request.get("/api/v1/search?theme=sante&limit=10");
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as {
      data: { deputies: unknown[]; scrutins: unknown[] };
    };
    expect(Array.isArray(body.data.deputies)).toBeTruthy();
    expect(Array.isArray(body.data.scrutins)).toBeTruthy();
  });

  test("compare endpoint validates deputy count", async ({ request }) => {
    const response = await request.get("/api/v1/compare?deputies=PA1");
    expect(response.status()).toBe(400);
  });
});
