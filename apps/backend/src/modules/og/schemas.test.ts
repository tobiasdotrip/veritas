import { describe, it, expect } from "vitest";
import { OgCompareQuery, OgDeputeQuery, OgScrutinQuery } from "./schemas.js";

describe("OG query schemas", () => {
  it("accepts valid deputy slug and ID", () => {
    expect(OgDeputeQuery.safeParse({ slug: "jean-dupont" }).success).toBe(true);
    expect(OgDeputeQuery.safeParse({ slug: "PA_TEST001" }).success).toBe(true);
  });

  it("rejects invalid deputy slug", () => {
    expect(OgDeputeQuery.safeParse({ slug: "../etc/passwd" }).success).toBe(
      false,
    );
  });

  it("accepts scrutin id", () => {
    expect(OgScrutinQuery.safeParse({ id: "VT_TEST001" }).success).toBe(true);
  });

  it("validates compare score bounds", () => {
    expect(OgCompareQuery.safeParse({ score: "50" }).success).toBe(true);
    expect(OgCompareQuery.safeParse({ score: "101" }).success).toBe(false);
    expect(OgCompareQuery.safeParse({ score: "-1" }).success).toBe(false);
  });
});
