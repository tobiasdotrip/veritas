import { expect, it } from "vitest";
import {
  describeIntegration,
  FIXTURE,
  useIntegrationTest,
} from "../../test-utils/index.js";

describeIntegration("GET /api/v1/og", () => {
  const ctx = useIntegrationTest();

  it("returns SVG for deputy OG card", async () => {
    const response = await ctx.injectJson<string>(ctx.app, {
      method: "GET",
      url: `/api/v1/og/depute?slug=${FIXTURE.deputies.dupont.slug}`,
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("image/svg+xml");
    expect(response.body).toMatch(/^<svg/);
    expect(response.body.length).toBeGreaterThan(500);
  });

  it("returns SVG for scrutin OG card", async () => {
    const response = await ctx.injectJson<string>(ctx.app, {
      method: "GET",
      url: `/api/v1/og/scrutin?id=${FIXTURE.scrutins.sante.id}`,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatch(/^<svg/);
  });

  it("returns SVG for comparateur OG card", async () => {
    const response = await ctx.injectJson<string>(ctx.app, {
      method: "GET",
      url: "/api/v1/og/comparateur?score=50",
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatch(/^<svg/);
  });

  it("returns 404 for unknown deputy slug", async () => {
    const response = await ctx.injectJson(ctx.app, {
      method: "GET",
      url: "/api/v1/og/depute?slug=inconnu-slug",
    });

    expect(response.status).toBe(404);
  });

  it("rejects invalid compare score", async () => {
    const response = await ctx.injectJson(ctx.app, {
      method: "GET",
      url: "/api/v1/og/comparateur?score=150",
    });

    expect(response.status).toBe(400);
  });
});
