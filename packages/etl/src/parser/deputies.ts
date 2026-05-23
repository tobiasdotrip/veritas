import { readFile } from "node:fs/promises";
import { extractAllJsonFromZipDir } from "./zip-extract.js";

export interface RawActeur {
  uid?: { "#text"?: string };
  etatCivil?: {
    ident?: {
      civ?: string;
      prenom?: string;
      nom?: string;
    };
    infoNaissance?: {
      dateNais?: string;
      villeNais?: string;
      paysNais?: string;
    };
    dateDeces?: unknown;
  };
  profession?: {
    libelleCourant?: string;
  };
  uriHatvp?: string;
  mandats?: {
    mandat?: RawMandat | RawMandat[];
  };
}

export interface RawActeurFile {
  acteur: RawActeur;
}

export interface RawMandat {
  uid?: string;
  acteurRef?: string;
  legislature?: string;
  typeOrgane?: string;
  organes?: {
    organeRef?: string;
  };
  dateDebut?: string;
  datePublication?: string;
  dateFin?: string | null;
  qualite?: string;
  election?: {
    lieu?: {
      region?: string;
      departement?: string;
      numDepartement?: string;
      numCirco?: string;
    };
  };
  mandature?: {
    datePriseFonction?: string;
    causeMandat?: string;
  };
  infosQualite?: {
    codeQualite?: string;
    libQualite?: string;
  };
}

export interface RawOrgane {
  uid?: string;
  codeType?: string;
  libelle?: string;
  libelleEdition?: string;
  libelleAbrege?: string;
  libelleAbrev?: string;
  legislature?: string;
  regimeJuridique?: string;
  viMoDe?: {
    dateDebut?: string;
    dateAgrement?: string;
    dateFin?: string | null;
  };
}

export interface RawOrganeFile {
  organe: RawOrgane;
}

export interface ParsedMandate {
  id: string;
  deputyId: string;
  legislature: string;
  startDate: Date;
  endDate?: Date | undefined;
  departmentId?: string | undefined;
  circoNumber?: number | undefined;
  circoLabel?: string | undefined;
  electionCause?: string | undefined;
  endCause?: string | undefined;
}

export interface ParsedAffiliation {
  deputyId: string;
  politicalGroupId: string;
  mandateId: string;
  startDate: Date;
  endDate?: Date | undefined;
}

export interface ParsedDeputy {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  civility?: string | undefined;
  dateOfBirth?: Date | undefined;
  placeOfBirth?: string | undefined;
  departmentId?: string | undefined;
  circoNumber?: number | undefined;
  circoLabel?: string | undefined;
  photoUrl?: string | undefined;
  profession?: string | undefined;
  mandates: ParsedMandate[];
  affiliations: ParsedAffiliation[];
}

export interface ParsedPoliticalGroup {
  id: string;
  legislature: string;
  name: string;
  abbreviation?: string | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

function normalizeDate(value: unknown): Date | undefined {
  if (!value || typeof value !== "string") return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function buildDeputySlug(
  firstName: string,
  lastName: string,
  id: string,
): string {
  const base = `${lastName.toLowerCase().replace(/\s+/g, "-")}-${firstName.toLowerCase().replace(/\s+/g, "-")}`;
  return `${base}-${id.toLowerCase()}`;
}

/**
 * Parse a single deputy from the new-format JSON file ({acteur: {...}}).
 */
export function parseDeputy(
  wrapper: RawActeurFile,
  legislature: string,
): ParsedDeputy {
  const raw = wrapper.acteur;
  const id = raw.uid?.["#text"] ?? "UNKNOWN";
  const firstName = raw.etatCivil?.ident?.prenom ?? "";
  const lastName = raw.etatCivil?.ident?.nom ?? "";
  const slug = buildDeputySlug(firstName, lastName, id);

  const mandates: ParsedMandate[] = [];
  const affiliations: ParsedAffiliation[] = [];

  const rawMandats = raw.mandats?.mandat;
  const mandatList = Array.isArray(rawMandats)
    ? rawMandats
    : rawMandats
      ? [rawMandats]
      : [];

  // First pass: collect ASSEMBLEE mandates (may appear after GP mandates)
  for (const m of mandatList) {
    if (!m.uid) continue;
    if (m.typeOrgane === "ASSEMBLEE") {
      // New format has numDepartement (code) separate from departement (name)
      const dept =
        m.election?.lieu?.numDepartement ?? m.election?.lieu?.departement;
      const circo = toNumber(m.election?.lieu?.numCirco);
      mandates.push({
        id: m.uid,
        deputyId: id,
        legislature: m.legislature ?? legislature,
        startDate: normalizeDate(m.dateDebut) ?? new Date(),
        endDate: normalizeDate(m.dateFin),
        departmentId: dept,
        circoNumber: circo,
        circoLabel: dept && circo ? `${dept}-${circo}` : undefined,
        electionCause: m.mandature?.causeMandat,
        endCause: undefined,
      });
    }
  }

  // Second pass: link GP (political group) affiliations to ASSEMBLEE mandate
  for (const m of mandatList) {
    if (!m.uid) continue;
    if (m.typeOrgane === "GP" && m.organes?.organeRef) {
      const assembleeMandate = mandates.find((x) => x.deputyId === id);
      affiliations.push({
        deputyId: id,
        politicalGroupId: m.organes.organeRef,
        mandateId: assembleeMandate?.id ?? m.uid,
        startDate: normalizeDate(m.dateDebut) ?? new Date(),
        endDate: normalizeDate(m.dateFin),
      });
    }
  }

  return {
    id,
    firstName,
    lastName,
    slug,
    civility: raw.etatCivil?.ident?.civ,
    dateOfBirth: normalizeDate(raw.etatCivil?.infoNaissance?.dateNais),
    placeOfBirth: raw.etatCivil?.infoNaissance?.villeNais,
    departmentId: mandates[0]?.departmentId,
    circoNumber: mandates[0]?.circoNumber,
    circoLabel: mandates[0]?.circoLabel,
    photoUrl: undefined,
    profession: raw.profession?.libelleCourant,
    mandates,
    affiliations,
  };
}

/**
 * Parse a single organe (political group / committee) from the new-format
 * JSON file ({organe: {...}}).
 */
export function parseOrgane(
  wrapper: RawOrganeFile,
  legislature: string,
): ParsedPoliticalGroup | undefined {
  const raw = wrapper.organe;
  if (raw.codeType !== "GP") return undefined;
  return {
    id: raw.uid ?? "UNKNOWN",
    legislature: raw.legislature ?? legislature,
    name: raw.libelle ?? "Unknown",
    abbreviation: raw.libelleAbrege,
    startDate: normalizeDate(raw.viMoDe?.dateDebut),
    endDate: normalizeDate(raw.viMoDe?.dateFin),
  };
}

/**
 * Parse all deputies from a zip containing individual JSON files
 * (json/acteur/PA*.json).
 */
export async function* parseDeputiesFromZip(
  zipPath: string,
  tempDir: string,
  legislature: string,
): AsyncGenerator<ParsedDeputy> {
  const files = await extractAllJsonFromZipDir(zipPath, tempDir, "json/acteur");

  for (const filePath of files) {
    const raw = JSON.parse(await readFile(filePath, "utf-8")) as RawActeurFile;
    if (!raw.acteur) {
      console.warn(`[etl] Skipping non-actor JSON: ${filePath}`);
      continue;
    }
    yield parseDeputy(raw, legislature);
  }
}

/**
 * Parse all organes (political groups) from a zip containing individual
 * JSON files (json/organe/PO*.json).
 */
export async function* parseOrganesFromZip(
  zipPath: string,
  tempDir: string,
  legislature: string,
): AsyncGenerator<ParsedPoliticalGroup> {
  const files = await extractAllJsonFromZipDir(zipPath, tempDir, "json/organe");

  for (const filePath of files) {
    const raw = JSON.parse(await readFile(filePath, "utf-8")) as RawOrganeFile;
    if (!raw.organe) {
      console.warn(`[etl] Skipping non-organe JSON: ${filePath}`);
      continue;
    }
    const parsed = parseOrgane(raw, legislature);
    if (parsed) yield parsed;
  }
}
