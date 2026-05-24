import { describe, expect, it } from "vitest";
import { isValidAmendmentUid, parseAmendment } from "./amendments.js";

describe("parseAmendment", () => {
  it("concatene numero et suffixe rect.", () => {
    const parsed = parseAmendment(
      {
        amendement: {
          uid: "AMANR5L17PO838901BTC1364P0D1N001867",
          identification: {
            numeroOrdreDepot: "1867",
            numeroRect: "1",
          },
          pointeurFragmentTexte: {
            division: {
              titre: "Article 4",
              articleDesignationCourte: "ART. 4",
            },
          },
        },
      },
      "DLR5L17N12345",
    );

    expect(parsed.numero).toBe("1867 rect.");
    expect(parsed.articleRef).toBe("ART. 4");
  });

  it("nettoie le HTML et parse les auteurs (format amendements_div_legis)", () => {
    const parsed = parseAmendment(
      {
        amendement: {
          uid: "AMANR5L17N42",
          identification: { numeroOrdreDepot: "42" },
          corps: {
            contenuAuteur: {
              dispositif:
                "<p>Texte&nbsp;de <strong>test</strong> &amp; vérification</p>",
              exposeSommaire: "<div>Exposé&nbsp;sommaire</div>",
            },
          },
          signataires: {
            auteur: { typeAuteur: "Député", acteurRef: "PA794734" },
            cosignataires: {
              acteurRef: ["PA842001", "PA793182"],
            },
          },
          cycleDeVie: { sort: "Rejeté" },
        },
      },
      "DLR5L17N99999",
    );

    expect(parsed.dispositif).toBe("Texte de test & vérification");
    expect(parsed.exposeSommaire).toBe("Exposé sommaire");
    expect(parsed.sortCode).toBe("Rejeté");
    expect(parsed.auteurs).toEqual([
      { type: "Député", acteurRef: "PA794734" },
      { type: "cosignataire", acteurRef: "PA842001" },
      { type: "cosignataire", acteurRef: "PA793182" },
    ]);
  });

  it("numero sans rectification", () => {
    const parsed = parseAmendment(
      {
        amendement: {
          uid: "AMANR5L17N42",
          identification: { numeroOrdreDepot: "42", numeroRect: "0" },
        },
      },
      "DLR",
    );

    expect(parsed.numero).toBe("42");
  });
});

describe("isValidAmendmentUid", () => {
  it("accepte les UID AN courts et longs", () => {
    expect(isValidAmendmentUid("AMANR5L17N1867")).toBe(true);
    expect(isValidAmendmentUid("AMANR5L17PO838901BTC1364P0D1N000613")).toBe(
      true,
    );
  });

  it("rejette les UID invalides", () => {
    expect(isValidAmendmentUid("")).toBe(false);
    expect(isValidAmendmentUid("AMANR5L17N18/67")).toBe(false);
    expect(isValidAmendmentUid("foo")).toBe(false);
    expect(isValidAmendmentUid(`AMANR5L17N${"1".repeat(60)}`)).toBe(false);
  });
});
