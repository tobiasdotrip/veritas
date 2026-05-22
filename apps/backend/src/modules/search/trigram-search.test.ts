import { describe, it, expect } from "vitest";
import {
  shouldUseTrigramFallback,
  TRIGRAM_SIMILARITY_THRESHOLD,
} from "./trigram-search.js";

describe("shouldUseTrigramFallback", () => {
  it("returns true for queries of 3 characters or fewer", () => {
    expect(shouldUseTrigramFallback("je")).toBe(true);
    expect(shouldUseTrigramFallback("jea")).toBe(true);
    expect(shouldUseTrigramFallback("  ab ")).toBe(true);
  });

  it("returns false for longer queries", () => {
    expect(shouldUseTrigramFallback("jean")).toBe(false);
    expect(shouldUseTrigramFallback("dupont")).toBe(false);
  });

  it("returns false for empty input", () => {
    expect(shouldUseTrigramFallback("")).toBe(false);
    expect(shouldUseTrigramFallback("   ")).toBe(false);
  });
});

describe("TRIGRAM_SIMILARITY_THRESHOLD", () => {
  it("is a sensible default between 0 and 1", () => {
    expect(TRIGRAM_SIMILARITY_THRESHOLD).toBeGreaterThan(0);
    expect(TRIGRAM_SIMILARITY_THRESHOLD).toBeLessThan(1);
  });
});
