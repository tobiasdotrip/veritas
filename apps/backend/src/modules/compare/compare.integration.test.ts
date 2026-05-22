import { expect, it } from "vitest";
import {
  describeIntegration,
  FIXTURE,
  useIntegrationTest,
} from "../../test-utils/index.js";

describeIntegration("GET /api/v1/compare", () => {
  const ctx = useIntegrationTest();

  it("compares two deputies by ID", async () => {
    const response = await ctx.injectJson<{
      data: {
        deputies: { id: string }[];
        totalCommonVotes: number;
        concordanceRate: number;
      };
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/compare?deputies=${FIXTURE.deputies.dupont.id},${FIXTURE.deputies.martin.id}`,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.deputies).toHaveLength(2);
    expect(response.body.data.totalCommonVotes).toBe(2);
  });

  it("compares deputies resolved by slug", async () => {
    const response = await ctx.injectJson<{
      data: { deputies: { slug: string }[] };
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/compare?deputies=${FIXTURE.deputies.dupont.slug},${FIXTURE.deputies.martin.slug}`,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.deputies.map((d) => d.slug).sort()).toEqual(
      [FIXTURE.deputies.dupont.slug, FIXTURE.deputies.martin.slug].sort(),
    );
  });

  it("calculates concordance from identical votes", async () => {
    const response = await ctx.injectJson<{
      data: {
        identicalVotes: number;
        totalCommonVotes: number;
        concordanceRate: number;
      };
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/compare?deputies=${FIXTURE.deputies.dupont.id},${FIXTURE.deputies.martin.id}`,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.identicalVotes).toBe(1);
    expect(response.body.data.totalCommonVotes).toBe(2);
    expect(response.body.data.concordanceRate).toBe(50);
  });

  it("lists divergences when deputies voted differently", async () => {
    const response = await ctx.injectJson<{
      data: {
        divergences: { scrutinId: string; positions: { position: string }[] }[];
      };
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/compare?deputies=${FIXTURE.deputies.dupont.id},${FIXTURE.deputies.martin.id}`,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.divergences).toHaveLength(1);
    expect(response.body.data.divergences[0]!.scrutinId).toBe(
      FIXTURE.scrutins.budget.id,
    );
    const positions = response.body.data.divergences[0]!.positions.map(
      (p) => p.position,
    );
    expect(positions).toContain("pour");
    expect(positions).toContain("contre");
  });

  it("filters by date range", async () => {
    const response = await ctx.injectJson<{
      data: { totalCommonVotes: number };
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/compare?deputies=${FIXTURE.deputies.dupont.id},${FIXTURE.deputies.martin.id}&from=2024-09-15&to=2024-10-31`,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.totalCommonVotes).toBe(1);
  });

  it("rejects fewer than two valid deputies", async () => {
    const response = await ctx.injectJson(ctx.app, {
      method: "GET",
      url: `/api/v1/compare?deputies=${FIXTURE.deputies.dupont.id},unknown-slug`,
    });

    expect(response.status).toBe(400);
  });
});
