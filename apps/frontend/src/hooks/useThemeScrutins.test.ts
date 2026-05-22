import { describe, it, expect, vi, beforeEach } from "vitest";
import { createQueryWrapper, renderHook, waitForHook } from "@/test-utils";
import { useThemeScrutins } from "./useThemeScrutins";

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api-client";

const mockApiFetch = vi.mocked(apiFetch);

describe("useThemeScrutins", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("does not fetch without theme", () => {
    const { result } = renderHook(() => useThemeScrutins(undefined), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("fetches scrutins filtered by theme slug", async () => {
    mockApiFetch.mockResolvedValue({
      data: [
        { id: "VT1", numero: 1, titre: "Test", dateScrutin: "2024-01-01" },
      ],
    });

    const { result } = renderHook(() => useThemeScrutins("sante", 20), {
      wrapper: createQueryWrapper(),
    });

    await waitForHook(result, (r) => r.isSuccess);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/scrutins?theme=sante&limit=20&sort=date_desc",
    );
    expect(result.current.data).toHaveLength(1);
  });
});
