import { describe, expect, it } from "vitest";
import {
  extractAmendmentNumber,
  normalizeAmendmentNumero,
  pickCandidateForScrutinTitle,
} from "./matcher.js";

describe("extractAmendmentNumber", () => {
  it("extrait un numero depuis un titre avec suffixe rect.", () => {
    const number = extractAmendmentNumber(
      "Sur l'amendement n° 1867 (rect.), présenté par le Gouvernement",
    );

    expect(number).toBe(1867);
  });
});

describe("normalizeAmendmentNumero", () => {
  it("supprime les variantes de suffixe rect.", () => {
    expect(normalizeAmendmentNumero("1867 rect.")).toBe("1867");
    expect(normalizeAmendmentNumero("1867 (rect.)")).toBe("1867");
    expect(normalizeAmendmentNumero("1867")).toBe("1867");
  });
});

describe("pickCandidateForScrutinTitle", () => {
  const candidates = [
    { id: "A1", numero: "1867", dossierRef: "DLR-A" },
    { id: "A2", numero: "1867 rect.", dossierRef: "DLR-B" },
  ];

  it("choisit l'amendement rectifie si le titre contient rect.", () => {
    const match = pickCandidateForScrutinTitle(
      candidates,
      "Vote sur l'amendement n° 1867 rect.",
    );
    expect(match?.id).toBe("A2");
  });

  it("choisit l'amendement standard sinon", () => {
    const match = pickCandidateForScrutinTitle(
      candidates,
      "Vote sur l'amendement n° 1867",
    );
    expect(match?.id).toBe("A1");
  });

  it("retourne undefined si ambigu", () => {
    const ambiguous = pickCandidateForScrutinTitle(
      [
        { id: "A1", numero: "1867", dossierRef: "DLR-A" },
        { id: "A2", numero: "1867", dossierRef: "DLR-B" },
      ],
      "Vote sur l'amendement n° 1867",
    );
    expect(ambiguous).toBeUndefined();
  });
});
