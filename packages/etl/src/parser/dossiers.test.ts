import { describe, expect, it } from "vitest";
import { parseDossierLegislatif } from "./dossiers.js";

describe("parseDossierLegislatif", () => {
  it("extracts dossierRef and titre from raw JSON", () => {
    const parsed = parseDossierLegislatif({
      dossierParlementaire: {
        uid: "DLR5L17N53259",
        legislature: "17",
        titreDossier: {
          titre: "L'approbation de l'accord entre la France et l'ESA",
          titreChemin: "approbation_accord_esa",
        },
      },
    });

    expect(parsed).toEqual({
      dossierRef: "DLR5L17N53259",
      legislature: "17",
      titre: "L'approbation de l'accord entre la France et l'ESA",
    });
  });

  it("returns undefined when titre is missing", () => {
    const parsed = parseDossierLegislatif({
      dossierParlementaire: {
        uid: "DLR5L17N99999",
        legislature: "17",
      },
    });

    expect(parsed).toBeUndefined();
  });
});
