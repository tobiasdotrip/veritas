import { expect, it } from "vitest";
import {
  describeIntegration,
  FIXTURE,
  useIntegrationTest,
} from "../../test-utils/index.js";

describeIntegration("GET /api/v1/deputies", () => {
  const ctx = useIntegrationTest();

  it("returns deputy profile by slug", async () => {
    const response = await ctx.injectJson<{
      data: { id: string; slug: string; stats: { votesCast: number } | null };
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/deputies/${FIXTURE.deputies.dupont.slug}`,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(FIXTURE.deputies.dupont.id);
    expect(response.body.data.stats?.votesCast).toBe(3);
  });

  it("returns deputy profile by ID", async () => {
    const response = await ctx.injectJson<{
      data: { slug: string };
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/deputies/${FIXTURE.deputies.martin.id}`,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.slug).toBe(FIXTURE.deputies.martin.slug);
  });

  it("returns 404 for unknown deputy", async () => {
    const response = await ctx.injectJson(ctx.app, {
      method: "GET",
      url: "/api/v1/deputies/inconnu-slug",
    });

    expect(response.status).toBe(404);
  });

  it("paginates deputy votes and filters by theme", async () => {
    const response = await ctx.injectJson<{
      data: { scrutinId: string }[];
      meta: { hasMore: boolean; nextCursor: string | null };
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/deputies/${FIXTURE.deputies.dupont.slug}/votes?theme=${FIXTURE.theme.slug}&limit=10`,
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]!.scrutinId).toBe(FIXTURE.scrutins.sante.id);
    expect(response.body.meta.hasMore).toBe(false);
  });

  it("lists deputies matching search query", async () => {
    const response = await ctx.injectJson<{
      data: { slug: string }[];
      total: number;
    }>(ctx.app, {
      method: "GET",
      url: "/api/v1/deputies?q=Dupont&limit=10&offset=0",
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]!.slug).toBe(FIXTURE.deputies.dupont.slug);
    expect(response.body.total).toBe(1);
  });

  it("returns deputy stats endpoint", async () => {
    const response = await ctx.injectJson<{
      data: {
        votesCast: number;
        participationRate: number;
        loyaltyRate: number;
      };
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/deputies/${FIXTURE.deputies.dupont.slug}/stats`,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.votesCast).toBe(3);
    expect(response.body.data.participationRate).toBe(100);
    expect(response.body.data.loyaltyRate).toBeCloseTo(66.67, 1);
  });

  it("paginates deputy votes with cursor", async () => {
    const first = await ctx.injectJson<{
      data: { scrutinId: string }[];
      meta: { nextCursor: string | null; hasMore: boolean };
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/deputies/${FIXTURE.deputies.dupont.slug}/votes?limit=1`,
    });

    expect(first.status).toBe(200);
    expect(first.body.data).toHaveLength(1);
    expect(first.body.meta.hasMore).toBe(true);
    expect(first.body.meta.nextCursor).toBeTruthy();

    const second = await ctx.injectJson<{
      data: { scrutinId: string }[];
      meta: { hasMore: boolean };
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/deputies/${FIXTURE.deputies.dupont.slug}/votes?limit=1&cursor=${encodeURIComponent(first.body.meta.nextCursor!)}`,
    });

    expect(second.status).toBe(200);
    expect(second.body.data).toHaveLength(1);
    expect(second.body.data[0]!.scrutinId).not.toBe(
      first.body.data[0]!.scrutinId,
    );
    expect(second.body.meta.hasMore).toBe(true);
  });

  it("rejects invalid theme slug on votes", async () => {
    const response = await ctx.injectJson(ctx.app, {
      method: "GET",
      url: `/api/v1/deputies/${FIXTURE.deputies.dupont.slug}/votes?theme=INVALID SLUG!`,
    });

    expect(response.status).toBe(400);
  });
});
