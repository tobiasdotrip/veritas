import { expect, it } from "vitest";
import {
  describeIntegration,
  FIXTURE,
  useIntegrationTest,
} from "../../test-utils/index.js";

describeIntegration("GET /api/v1/themes", () => {
  const ctx = useIntegrationTest();

  it("lists themes with scrutins count for the legislature", async () => {
    const response = await ctx.injectJson<{
      data: {
        slug: string;
        label: string;
        scrutinsCount: number;
      }[];
    }>(ctx.app, {
      method: "GET",
      url: `/api/v1/themes?legislature=${FIXTURE.legislatureId}`,
    });

    expect(response.status).toBe(200);
    const sante = response.body.data.find((t) => t.slug === FIXTURE.theme.slug);
    expect(sante).toBeDefined();
    expect(sante!.scrutinsCount).toBe(1);
    expect(sante!.label).toBe(FIXTURE.theme.label);
  });

  it("returns zero scrutins count for themes outside the legislature", async () => {
    const response = await ctx.injectJson<{
      data: { slug: string; scrutinsCount: number }[];
    }>(ctx.app, {
      method: "GET",
      url: "/api/v1/themes?legislature=99",
    });

    expect(response.status).toBe(200);
    const sante = response.body.data.find((t) => t.slug === FIXTURE.theme.slug);
    expect(sante?.scrutinsCount ?? 0).toBe(0);
  });
});
