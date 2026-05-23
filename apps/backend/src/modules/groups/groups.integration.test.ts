import { expect, it } from "vitest";
import {
  describeIntegration,
  FIXTURE,
  useIntegrationTest,
} from "../../test-utils/index.js";

describeIntegration("GET /api/v1/groups", () => {
  const ctx = useIntegrationTest();

  it("lists political groups for the legislature", async () => {
    const response = await ctx.injectJson<{
      data: { id: string; name: string }[];
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/groups?legislature=${FIXTURE.legislatureId}`,
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]!.id).toBe(FIXTURE.group.id);
    expect(response.body.data[0]!.name).toBe(FIXTURE.group.name);
  });

  it("returns group stats with vote distribution", async () => {
    const response = await ctx.injectJson<{
      data: {
        groupId: string;
        totalMembers: number;
        totalScrutins: number;
        avgParticipationRate: number;
        voteDistribution: { pour: number };
      };
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/groups/${FIXTURE.group.id}/stats?legislature=${FIXTURE.legislatureId}`,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.groupId).toBe(FIXTURE.group.id);
    expect(response.body.data.totalMembers).toBe(3);
    expect(response.body.data.totalScrutins).toBe(3);
    expect(response.body.data.avgParticipationRate).toBeGreaterThan(0);
    expect(response.body.data.voteDistribution.pour).toBeGreaterThan(0);
  });

  it("returns 404 for unknown group", async () => {
    const response = await ctx.injectJson(ctx.app, {
      method: "GET",
      url: "/api/v1/groups/PO_UNKNOWN/stats",
    });

    expect(response.status).toBe(404);
  });
});
