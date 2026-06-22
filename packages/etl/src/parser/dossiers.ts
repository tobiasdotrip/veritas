import { readFile } from "node:fs/promises";
import { extractAllJsonFromZipDir } from "./zip-extract.js";

// ─── Types bruts (format AN OpenData) ────────────────────────────

interface RawDossierWrapper {
  dossierParlementaire: RawDossierParlementaire;
}

interface RawDossierParlementaire {
  uid: string;
  legislature: string;
  titreDossier?: {
    titre?: string;
    titreChemin?: string;
  };
}

// ─── Types parsés ────────────────────────────────────────────────

export interface ParsedDossierLegislatif {
  dossierRef: string;
  legislature: string;
  titre: string;
}

// ─── Parsing ─────────────────────────────────────────────────────

function normalizeTitle(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Parse a single legislative dossier from its JSON file.
 */
export function parseDossierLegislatif(
  wrapper: RawDossierWrapper,
): ParsedDossierLegislatif | undefined {
  const raw = wrapper.dossierParlementaire;
  const titre = normalizeTitle(raw.titreDossier?.titre);
  if (!titre) {
    return undefined;
  }
  return {
    dossierRef: raw.uid,
    legislature: raw.legislature,
    titre,
  };
}

// ─── Générateur async ────────────────────────────────────────────

/**
 * Parses all legislative dossiers from a Dossiers_Legislatifs.json.zip file.
 */
export async function* parseDossiersLegislatifsFromZip(
  zipPath: string,
  tempDir: string,
  limits: {
    maxFiles: number;
    maxTotalUncompressedBytes: number;
  },
): AsyncGenerator<ParsedDossierLegislatif> {
  const files = await extractAllJsonFromZipDir(
    zipPath,
    tempDir,
    "json/dossierParlementaire",
    limits,
  );

  for (const filePath of files) {
    let raw: RawDossierWrapper;
    try {
      raw = JSON.parse(
        await readFile(filePath, "utf-8"),
      ) as RawDossierWrapper;
    } catch (err) {
      console.warn(
        `[etl] Failed to parse dossier JSON ${filePath}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      continue;
    }

    if (!raw.dossierParlementaire?.uid) {
      console.warn(
        `[etl] Skipping malformed dossier JSON: ${filePath}`,
      );
      continue;
    }

    const parsed = parseDossierLegislatif(raw);
    if (parsed) {
      yield parsed;
    }
  }
}
