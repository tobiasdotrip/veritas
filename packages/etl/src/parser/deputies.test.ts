import { describe, it, expect } from "vitest";
import { buildDeputySlug, parseDeputy } from "./deputies.js";

describe("buildDeputySlug", () => {
  it("includes deputy id to avoid homonym collisions", () => {
    const slugA = buildDeputySlug("Jean", "Martin", "PA0001");
    const slugB = buildDeputySlug("Jean", "Martin", "PA0002");

    expect(slugA).toBe("martin-jean-pa0001");
    expect(slugB).toBe("martin-jean-pa0002");
    expect(slugA).not.toBe(slugB);
  });
});

describe("parseDeputy", () => {
  it("generates a unique slug from acteur data", () => {
    const parsed = parseDeputy(
      {
        acteur: {
          uid: { "#text": "PA1234" },
          etatCivil: {
            ident: { prenom: "Marie", nom: "Dupont" },
          },
        },
      },
      "17",
    );

    expect(parsed.slug).toBe("dupont-marie-pa1234");
  });
});
