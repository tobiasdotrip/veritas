import { expect, it } from "vitest";
import { describeIntegration, useIntegrationTest } from "./test-utils/index.js";

describeIntegration("backend health", () => {
  const ctx = useIntegrationTest();

  it("GET /health returns ok", async () => {
    const response = await ctx.injectJson<{ status: string }>(ctx.app, {
      method: "GET",
      url: "/health",
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });
});
