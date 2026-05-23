import { describe, it, expect } from "vitest";
import { toPrefixTsQuery } from "./ts-query.js";

describe("toPrefixTsQuery", () => {
  it("returns empty string for empty input", () => {
    expect(toPrefixTsQuery("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(toPrefixTsQuery("   ")).toBe("");
  });

  it("prefixes each word for multi-word queries", () => {
    expect(toPrefixTsQuery("jean dup")).toBe("jean:* & dup:*");
  });

  it("trims and collapses whitespace", () => {
    expect(toPrefixTsQuery("  jean   dup  ")).toBe("jean:* & dup:*");
  });

  it("prefixes a single word", () => {
    expect(toPrefixTsQuery("martin")).toBe("martin:*");
  });

  it("preserves hyphens in compound names", () => {
    expect(toPrefixTsQuery("jean-michel")).toBe("jean-michel:*");
  });

  it("handles two-segment compound (most common case)", () => {
    expect(toPrefixTsQuery("marie-christine")).toBe("marie-christine:*");
  });

  it("returns empty for double-dash input", () => {
    expect(toPrefixTsQuery("--")).toBe("");
  });

  it("strips leading hyphens from words", () => {
    expect(toPrefixTsQuery("-dupont")).toBe("dupont:*");
  });

  it("strips trailing hyphens from words", () => {
    expect(toPrefixTsQuery("dupont-")).toBe("dupont:*");
  });

  it("collapses repeated hyphens", () => {
    expect(toPrefixTsQuery("jean--michel")).toBe("jean-michel:*");
  });

  it("handles multi-hyphen compound names", () => {
    expect(toPrefixTsQuery("marie-christine-blanc")).toBe(
      "marie-christine-blanc:*",
    );
  });

  it("preserves accented characters", () => {
    expect(toPrefixTsQuery("été")).toBe("été:*");
  });

  it("handles mixed case multi-word queries", () => {
    expect(toPrefixTsQuery("Jean Dupont")).toBe("Jean:* & Dupont:*");
  });

  it("strips tsquery operators from injection attempts", () => {
    expect(toPrefixTsQuery("' OR 1=1 --")).toBe("OR:* & 11:*");
  });

  it("returns empty string when only operators remain", () => {
    expect(toPrefixTsQuery("!|&()")).toBe("");
  });

  it("returns empty string for punctuation-only input", () => {
    expect(toPrefixTsQuery("!!!")).toBe("");
  });

  it("includes numeric tokens", () => {
    expect(toPrefixTsQuery("scrutin 42")).toBe("scrutin:* & 42:*");
  });

  it("strips trailing punctuation from words", () => {
    expect(toPrefixTsQuery("jean dupont!")).toBe("jean:* & dupont:*");
  });

  it("handles single-character queries", () => {
    expect(toPrefixTsQuery("a")).toBe("a:*");
  });

  it("handles long queries without truncation", () => {
    const long = "a".repeat(100);
    expect(toPrefixTsQuery(long)).toBe(`${long}:*`);
  });

  it("handles unicode letters beyond Latin", () => {
    expect(toPrefixTsQuery("北京")).toBe("北京:*");
  });

  it("strips quotes and semicolons from SQL injection payloads", () => {
    expect(toPrefixTsQuery('"; DROP TABLE deputies; --')).toBe(
      "DROP:* & TABLE:* & deputies:*",
    );
  });
});
