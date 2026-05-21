import { describe, it, expect, vi, afterEach } from "vitest";
import { apiFetch, ApiError } from "./api-client.js";

describe("apiFetch error parsing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses RFC 7807 problem details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({
          type: "https://veritas.fr/errors/not_found",
          title: "Not Found",
          status: 404,
          detail: "Deputy 'PA123' not found",
          code: "NOT_FOUND",
        }),
      }),
    );

    await expect(apiFetch("/deputies/PA123")).rejects.toEqual(
      new ApiError(404, "NOT_FOUND", "Deputy 'PA123' not found"),
    );
  });

  it("parses legacy { error: { code, message } } payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({
          error: { code: "VALIDATION_ERROR", message: "Invalid input" },
        }),
      }),
    );

    await expect(apiFetch("/search?q=x")).rejects.toEqual(
      new ApiError(400, "VALIDATION_ERROR", "Invalid input"),
    );
  });
});
