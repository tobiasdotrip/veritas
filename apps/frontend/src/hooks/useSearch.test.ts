import { describe, it, expect, vi, beforeEach } from "vitest";
import { createQueryWrapper, renderHook, waitForHook } from "@/test-utils";
import { useSearch } from "./useSearch";

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api-client";

const mockApiFetch = vi.mocked(apiFetch);

describe("useSearch", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("does not fetch when query is shorter than 2 characters", () => {
    const { result } = renderHook(() => useSearch("j"), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("fetches search results when query is long enough", async () => {
    mockApiFetch.mockResolvedValue({
      data: {
        deputies: [{ id: "PA1", slug: "jean-dupont" }],
        scrutins: [],
      },
    });

    const { result } = renderHook(() => useSearch("jean", 0, 20), {
      wrapper: createQueryWrapper(),
    });

    await waitForHook(result, (r) => r.isSuccess);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/search?q=jean&offset=0&limit=20",
    );
    expect(result.current.data?.deputies).toHaveLength(1);
  });
});
