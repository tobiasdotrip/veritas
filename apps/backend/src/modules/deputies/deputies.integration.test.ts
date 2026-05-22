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
});
