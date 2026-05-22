import { expect, it } from "vitest";
import {
  describeIntegration,
  FIXTURE,
  useIntegrationTest,
} from "../../test-utils/index.js";

describeIntegration("GET /api/v1/scrutins", () => {
  const ctx = useIntegrationTest();

  it("lists scrutins with cursor pagination", async () => {
    const first = await ctx.injectJson<{
      data: { id: string }[];
      meta: { nextCursor: string | null; hasMore: boolean };
    }>(ctx.app, {
      method: "GET",
      url: "/api/v1/scrutins?limit=2",
    });

    expect(first.status).toBe(200);
    expect(first.body.data).toHaveLength(2);
    expect(first.body.meta.hasMore).toBe(true);
    expect(first.body.meta.nextCursor).toBeTruthy();

    const second = await ctx.injectJson<{
      data: { id: string }[];
      meta: { hasMore: boolean };
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/scrutins?limit=2&cursor=${encodeURIComponent(first.body.meta.nextCursor!)}`,
    });

    expect(second.status).toBe(200);
    expect(second.body.data).toHaveLength(1);
    expect(second.body.meta.hasMore).toBe(false);
  });

  it("filters scrutins by theme", async () => {
    const response = await ctx.injectJson<{
      data: { id: string }[];
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/scrutins?theme=${FIXTURE.theme.slug}&limit=20`,
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]!.id).toBe(FIXTURE.scrutins.sante.id);
  });

  it("returns scrutin detail with themes", async () => {
    const response = await ctx.injectJson<{
      data: {
        id: string;
        themes: { slug: string }[];
      };
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/scrutins/${FIXTURE.scrutins.sante.id}`,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(FIXTURE.scrutins.sante.id);
    expect(
      response.body.data.themes.some((t) => t.slug === FIXTURE.theme.slug),
    ).toBe(true);
  });

  it("rejects invalid theme slug", async () => {
    const response = await ctx.injectJson(ctx.app, {
      method: "GET",
      url: "/api/v1/scrutins?theme=INVALID SLUG!",
    });

    expect(response.status).toBe(400);
  });

  it("searches scrutins by text query", async () => {
    const response = await ctx.injectJson<{
      data: { id: string }[];
    }>(ctx.app, {
      method: "GET",
      url: "/api/v1/scrutins?q=finances&limit=20",
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]!.id).toBe(FIXTURE.scrutins.budget.id);
  });

  it("filters scrutins by date range", async () => {
    const response = await ctx.injectJson<{
      data: { id: string }[];
    }>(ctx.app, {
      method: "GET",
      url: "/api/v1/scrutins?from=2024-09-01&to=2024-10-31&limit=20",
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
  });

  it("returns 404 for unknown scrutin", async () => {
    const response = await ctx.injectJson(ctx.app, {
      method: "GET",
      url: "/api/v1/scrutins/VT_UNKNOWN",
    });

    expect(response.status).toBe(404);
  });

  it("lists individual votes for a scrutin", async () => {
    const response = await ctx.injectJson<{
      data: { deputySlug: string; position: string }[];
      total: number;
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/scrutins/${FIXTURE.scrutins.budget.id}/votes?limit=10&offset=0`,
    });

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.data).toHaveLength(2);
  });

  it("filters scrutin votes by position", async () => {
    const response = await ctx.injectJson<{
      data: { deputySlug: string; position: string }[];
      total: number;
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/scrutins/${FIXTURE.scrutins.budget.id}/votes?position=contre&limit=10&offset=0`,
    });

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.data[0]!.deputySlug).toBe(
      FIXTURE.deputies.martin.slug,
    );
    expect(response.body.data[0]!.position).toBe("contre");
  });
});
