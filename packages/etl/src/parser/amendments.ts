import { readFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { resolve, basename } from "node:path";
import {
  assertZipExtractionLimits,
  isZipEntrySymlink,
} from "./zip-entry-type.js";
import { resolveSafeZipEntryPath } from "./safe-zip-path.js";
import { withZipEntries } from "./zip-extract.js";

// ─── Types bruts (format AN OpenData) ────────────────────────────

interface RawAmendementWrapper {
  amendement: RawAmendement;
}

interface RawAmendement {
  uid: string;
  identification?: {
    numeroOrdreDepot?: string;
    numeroRect?: string;
    suffixe?: string;
  };
  texteLegislatifRef?: string;
  corps?: {
    contenuAuteur?: {
      dispositif?: string;
      exposeSommaire?: string;
    };
  };
  cycleDeVie?: {
    sort?: string;
  };
  signataires?: {
    auteur?: RawAuteur;
    cosignataires?: {
      acteurRef?: string | string[];
    };
  };
  pointeurFragmentTexte?: {
    division?: {
      titre?: string;
      articleDesignationCourte?: string;
    };
  };
}

interface RawAuteur {
  typeAuteur?: string;
  acteurRef?: string;
  groupePolitiqueRef?: string;
}

// ─── Types parsés ────────────────────────────────────────────────

export interface ParsedAuteur {
  type: string;
  acteurRef?: string | undefined;
  nom?: string | undefined;
  prenom?: string | undefined;
  libelle?: string | undefined;
}

export interface ParsedAmendment {
  id: string;
  numero: string;
  texteLegislatifRef?: string | undefined;
  dossierRef: string;
  dispositif?: string | undefined;
  exposeSommaire?: string | undefined;
  sortCode?: string | undefined;
  articleRef?: string | undefined;
  auteurs: ParsedAuteur[];
}

// ─── Extraction spécifique aux amendements ───────────────────────

export interface AmendmentJsonEntry {
  filePath: string;
  dossierRef: string;
}

/**
 * Extracts amendment JSON files from the zip while capturing dossierRef
 * from the directory path (amendements/<dossierRef>/<file>.json).
 */
export async function extractAmendmentsJsonFromZip(
  zipPath: string,
  tempDir: string,
  limits: {
    maxFiles: number;
    maxTotalUncompressedBytes: number;
  },
): Promise<AmendmentJsonEntry[]> {
  return withZipEntries(zipPath, async (zip, entries) => {
    const amendEntries = Object.entries(entries).filter(
      ([name, entry]) =>
        name.startsWith("json/") &&
        name.endsWith(".json") &&
        !entry.isDirectory,
    );

    if (amendEntries.length === 0) {
      throw new Error(`No amendment JSON entries found in ${zipPath}`);
    }
    assertZipExtractionLimits(
      amendEntries.map(([, entry]) => entry),
      {
        maxFiles: limits.maxFiles,
        maxTotalUncompressedBytes: limits.maxTotalUncompressedBytes,
        label: "ZIP extraction for amendements",
      },
    );

    const outDir = resolve(tempDir, "amendements");
    await mkdir(outDir, { recursive: true });

    const results: AmendmentJsonEntry[] = [];
    for (const [name, entry] of amendEntries) {
      if (isZipEntrySymlink(entry)) {
        console.warn(`[etl] Skipping symlink entry in zip: ${name}`);
        continue;
      }

      // Extract dossierRef from path: json/DLR.../PNREANR.../AMAN...json
      const pathParts = name.split("/");
      if (pathParts.length < 4) {
        console.warn(`[etl] Unexpected amendment path structure: ${name}`);
        continue;
      }
      const dossierRef = pathParts[1]!; // DLR5L17N51777
      const fileName = basename(name);

      const outPath = resolveSafeZipEntryPath(outDir, fileName);
      await zip.extract(name, outPath);
      results.push({ filePath: outPath, dossierRef });
    }

    return results;
  });
}

// ─── Parsing ─────────────────────────────────────────────────────

function parseAuteurs(raw: RawAmendement["signataires"]): ParsedAuteur[] {
  if (!raw) return [];
  const auteurs: ParsedAuteur[] = [];
  if (raw.auteur) {
    auteurs.push({
      type: raw.auteur.typeAuteur ?? "inconnu",
      acteurRef: raw.auteur.acteurRef,
    });
  }
  const cosig = raw.cosignataires?.acteurRef;
  if (cosig) {
    const refs = Array.isArray(cosig) ? cosig : [cosig];
    for (const ref of refs) {
      auteurs.push({
        type: "cosignataire",
        acteurRef: ref,
      });
    }
  }
  return auteurs;
}

/**
 * Strips HTML tags and decodes common HTML entities.
 * Returns clean plain text.
 */
function stripHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;

  const text = html
    // Remove HTML tags
    .replace(/<[^>]*>/g, " ")
    // Decode common entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, n) =>
      String.fromCharCode(Number.parseInt(n, 16)),
    )
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();

  return text || undefined;
}

const AMENDMENT_UID_RE = /^AMANR\d+L\d+[A-Z0-9]*N\d+$/;

export function isValidAmendmentUid(uid: string): boolean {
  if (uid.length === 0 || uid.length > 50) return false;
  return AMENDMENT_UID_RE.test(uid);
}

/**
 * Normalise la valeur de sort provenant du JSON AN.
 * Le champ peut être :
 *   - une string (ex: "Rejeté", "Adopté")
 *   - un objet XML nil {"@xsi:nil": "true"} → null
 *   - absent → null
 */
function normalizeSort(value: unknown): string | undefined {
  if (typeof value === "string") return value || undefined;
  if (value && typeof value === "object" && "@xsi:nil" in value) {
    return undefined; // XML nil → pas de sort
  }
  return undefined;
}

/**
 * Parse a single amendment from its JSON file.
 * The dossierRef comes from the zip directory structure.
 */
export function parseAmendment(
  wrapper: RawAmendementWrapper,
  dossierRef: string,
): ParsedAmendment {
  const raw = wrapper.amendement;

  const numero = raw.identification?.numeroOrdreDepot ?? "0";
  // Rectification: numeroRect = "0" means not rectified
  const isRect =
    raw.identification?.numeroRect && raw.identification.numeroRect !== "0";

  return {
    id: raw.uid,
    numero: isRect ? `${numero} rect.` : numero,
    texteLegislatifRef: raw.texteLegislatifRef,
    dossierRef,
    dispositif: stripHtml(raw.corps?.contenuAuteur?.dispositif),
    exposeSommaire: stripHtml(raw.corps?.contenuAuteur?.exposeSommaire),
    sortCode: normalizeSort(raw.cycleDeVie?.sort),
    articleRef: raw.pointeurFragmentTexte?.division?.articleDesignationCourte,
    auteurs: parseAuteurs(raw.signataires),
  };
}

// ─── Générateur async ────────────────────────────────────────────

/**
 * Parses all amendments from an Amendments.json.zip file.
 * Yields each amendment with its dossierRef from the zip directory structure.
 */
export async function* parseAmendmentsFromZip(
  zipPath: string,
  tempDir: string,
  limits: {
    maxFiles: number;
    maxTotalUncompressedBytes: number;
  },
): AsyncGenerator<ParsedAmendment> {
  const entries = await extractAmendmentsJsonFromZip(zipPath, tempDir, limits);

  for (const entry of entries) {
    let raw: RawAmendementWrapper;
    try {
      raw = JSON.parse(
        await readFile(entry.filePath, "utf-8"),
      ) as RawAmendementWrapper;
    } catch (err) {
      console.warn(
        `[etl] Failed to parse amendment JSON ${entry.filePath}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      continue;
    }

    if (!raw.amendement?.uid || !isValidAmendmentUid(raw.amendement.uid)) {
      console.warn(
        `[etl] Skipping malformed amendment UID in JSON: ${entry.filePath}`,
      );
      continue;
    }

    yield parseAmendment(raw, entry.dossierRef);
  }
}
