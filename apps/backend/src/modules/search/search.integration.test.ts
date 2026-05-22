import { expect, it } from "vitest";
import {
  describeIntegration,
  FIXTURE,
  useIntegrationTest,
} from "../../test-utils/index.js";

describeIntegration("GET /api/v1/search", () => {
  const ctx = useIntegrationTest();

  it("returns deputies and scrutins for a valid query", async () => {
    const response = await ctx.injectJson<{
      data: { deputies: { slug: string }[]; scrutins: { id: string }[] };
    }>(ctx.app, {
      method: "GET",
      url: "/api/v1/search?q=santé&limit=10",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.scrutins.some((s) => s.id === FIXTURE.scrutins.sante.id)).toBe(true);
  });

  it("returns empty arrays for a query with no matches", async () => {
    const response = await ctx.injectJson<{
      data: { deputies: unknown[]; scrutins: unknown[] };
    }>(ctx.app, {
      method: "GET",
      url: "/api/v1/search?q=zzzzzzzzzzzzzzzzzzzz&limit=10",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.deputies).toEqual([]);
    expect(response.body.data.scrutins).toEqual([]);
  });

  it("respects the limit parameter", async () => {
    const response = await ctx.injectJson<{
      data: { deputies: unknown[]; scrutins: unknown[] };
      meta: { total: number };
    }>(ctx.app, {
      method: "GET",
      url: "/api/v1/search?q=projet&limit=1",
    });

    expect(response.status).toBe(200);
    expect(
      response.body.data.deputies.length + response.body.data.scrutins.length,
    ).toBeLessThanOrEqual(2);
  });

  it("rejects tsquery injection operators safely", async () => {
    const response = await ctx.injectJson<{ data: unknown[] }>(ctx.app, {
      method: "GET",
      url: "/api/v1/search/suggestions?q=!|&()&limit=5",
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("interleaves deputies and scrutins in suggestions", async () => {
    const response = await ctx.injectJson<{
      data: { type: string; id: string }[];
    }>(ctx.app, {
      method: "GET",
      url: "/api/v1/search/suggestions?q=jean&limit=10",
    });

    expect(response.status).toBe(200);
    const types = new Set(response.body.data.map((item) => item.type));
    expect(types.has("deputy")).toBe(true);
    expect(
      response.body.data.some((item) => item.id === FIXTURE.deputies.dupont.id),
    ).toBe(true);
  });
});
