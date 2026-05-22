import { describe, it, expect, vi, beforeEach } from "vitest";
import { createQueryWrapper, renderHook, waitForHook } from "@/test-utils";
import { useComparison } from "./useComparison";

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api-client";

const mockApiFetch = vi.mocked(apiFetch);

describe("useComparison", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("does not fetch without compared deputies", () => {
    const { result } = renderHook(
      () => useComparison("jean-dupont", [], "legislature"),
      { wrapper: createQueryWrapper() },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("fetches comparison with reference and compared slugs", async () => {
    mockApiFetch.mockResolvedValue({
      data: {
        deputies: [],
        totalCommonVotes: 0,
        identicalVotes: 0,
        concordanceRate: 0,
        divergences: [],
        pairwise: [],
      },
    });

    const { result } = renderHook(
      () => useComparison("jean-dupont", ["marie-martin"], "30j"),
      { wrapper: createQueryWrapper() },
    );

    await waitForHook(result, (r) => r.isSuccess);

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    const url = mockApiFetch.mock.calls[0]![0] as string;
    expect(url).toContain("deputies=jean-dupont%2Cmarie-martin");
    expect(url).toContain("from=");
  });

  it("omits from parameter for legislature period", async () => {
    mockApiFetch.mockResolvedValue({
      data: {
        deputies: [],
        totalCommonVotes: 0,
        identicalVotes: 0,
        concordanceRate: 0,
        divergences: [],
        pairwise: [],
      },
    });

    const { result } = renderHook(
      () => useComparison("jean-dupont", ["marie-martin"], "legislature"),
      { wrapper: createQueryWrapper() },
    );

    await waitForHook(result, (r) => r.isSuccess);

    const url = mockApiFetch.mock.calls[0]![0] as string;
    expect(url).not.toContain("from=");
  });
});
