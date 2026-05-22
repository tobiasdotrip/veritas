import { test, expect } from "@playwright/test";

const hasFrontend = Boolean(process.env.E2E_FRONTEND_BASE_URL);

test.describe("Frontend journeys", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "frontend-smoke",
      "Frontend journey tests only run in the frontend-smoke project",
    );
    test.skip(!hasFrontend, "Set E2E_FRONTEND_BASE_URL to run frontend journeys");
  });

  test("search page loads and accepts input", async ({ page }) => {
    await page.goto("/recherche");
    await expect(
      page.getByRole("heading", { name: "Recherche" }),
    ).toBeVisible();
    await page.getByRole("combobox").fill("jean");
    await expect(page.getByRole("combobox")).toHaveValue("jean");
  });

  test("search page shows active theme filter", async ({ page }) => {
    await page.goto("/recherche?theme=sante");
    await expect(page.getByText("Thématique :")).toBeVisible();
    await expect(page.getByText("sante")).toBeVisible();
  });

  test("comparateur page loads with empty state", async ({ page }) => {
    await page.goto("/comparateur");
    await expect(
      page.getByRole("heading", { name: "Comparateur de votes" }),
    ).toBeVisible();
    await expect(
      page.getByText("Aucun député sélectionné"),
    ).toBeVisible();
  });

  test("depute page shows load-more control when votes exist", async ({
    page,
  }) => {
    await page.goto("/recherche?q=dupont");
    const deputyLink = page.getByRole("link").filter({ hasText: "Dupont" });
    if ((await deputyLink.count()) === 0) {
      test.skip(true, "No deputy data available for pagination test");
    }
    await deputyLink.first().click();
    await expect(page.getByRole("heading", { level: 2, name: "Votes" })).toBeVisible();
    const loadMore = page.getByRole("button", { name: "Charger plus" });
    if ((await loadMore.count()) > 0) {
      await expect(loadMore).toBeVisible();
    }
  });

  test("mobile viewport keeps main navigation usable", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Transparence des votes" }),
    ).toBeVisible();
    await page.goto("/recherche");
    await expect(page.getByRole("heading", { name: "Recherche" })).toBeVisible();
  });

  test("search page shows error fallback when API fails", async ({ page }) => {
    await page.route("**/api/v1/search?**", (route) =>
      route.fulfill({ status: 503, body: "Service unavailable" }),
    );
    await page.goto("/recherche?q=testquery");
    await expect(page.getByText("Erreur de chargement")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("scrutin results link navigates from search", async ({ page }) => {
    await page.goto("/recherche?q=projet&type=scrutin");
    await page.waitForTimeout(500);
    const scrutinLink = page.getByRole("link").filter({ hasText: "Scrutin n°" });
    if ((await scrutinLink.count()) === 0) {
      test.skip(true, "No scrutin data available for navigation test");
    }
    await scrutinLink.first().click();
    await expect(page).toHaveURL(/\/scrutin\//);
  });
});
