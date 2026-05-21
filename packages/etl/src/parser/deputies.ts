import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { parser } from "stream-json/Parser";
import { extractJsonEntryFromZip } from "./zip-extract.js";
import { pick } from "stream-json/filters/Pick";
import { streamArray } from "stream-json/streamers/StreamArray";

export interface RawActeur {
  uid?: { "#text"?: string };
  etatCivil?: {
    ident?: {
      civ?: string;
      prenom?: string;
      nom?: string;
    };
    dateNaissance?: string;
    lieuNaissance?: {
      ville?: string;
      pays?: string;
    };
  };
  profession?: {
    libelleCourant?: string;
  };
  uriHatvp?: string;
  mandats?: {
    mandat?: RawMandat | RawMandat[];
  };
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

export function parseDeputy(raw: RawActeur, legislature: string): ParsedDeputy {
  const id = raw.uid?.["#text"] ?? "UNKNOWN";
  const firstName = raw.etatCivil?.ident?.prenom ?? "";
  const lastName = raw.etatCivil?.ident?.nom ?? "";
  const slug = `${lastName.toLowerCase().replace(/\s+/g, "-")}-${firstName.toLowerCase().replace(/\s+/g, "-")}`;

  const mandates: ParsedMandate[] = [];
  const affiliations: ParsedAffiliation[] = [];

  const rawMandats = raw.mandats?.mandat;
  const mandatList = Array.isArray(rawMandats)
    ? rawMandats
    : rawMandats
      ? [rawMandats]
      : [];

  for (const m of mandatList) {
    if (!m.uid) continue;

    if (m.typeOrgane === "ASSEMBLEE") {
      const dept = m.election?.lieu?.departement;
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
    } else if (m.typeOrgane === "GP" && m.organes?.organeRef) {
      const parentMandate = mandates.find((x) => x.deputyId === id);
      affiliations.push({
        deputyId: id,
        politicalGroupId: m.organes.organeRef,
        mandateId: parentMandate?.id ?? m.acteurRef ?? id,
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
    dateOfBirth: normalizeDate(raw.etatCivil?.dateNaissance),
    placeOfBirth: raw.etatCivil?.lieuNaissance?.ville,
    departmentId: mandates[0]?.departmentId,
    circoNumber: mandates[0]?.circoNumber,
    circoLabel: mandates[0]?.circoLabel,
    photoUrl: undefined,
    profession: raw.profession?.libelleCourant,
    mandates,
    affiliations,
  };
}

export function parseOrgane(
  raw: RawOrgane,
  legislature: string
): ParsedPoliticalGroup | undefined {
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

export async function* parseDeputiesFromZip(
  zipPath: string,
  tempDir: string,
  legislature: string
): AsyncGenerator<ParsedDeputy> {
  const extractedPath = await extractJsonEntryFromZip(zipPath, tempDir);

  const fileStream = createReadStream(extractedPath);
  const p = parser();
  const filter = pick({ filter: "export.acteurs.acteur" });
  const array = streamArray();

  await pipeline(fileStream, p, filter, array);

  for await (const chunk of array) {
    yield parseDeputy(chunk.value as RawActeur, legislature);
  }
}

export async function* parseOrganesFromZip(
  zipPath: string,
  tempDir: string,
  legislature: string
): AsyncGenerator<ParsedPoliticalGroup> {
  const extractedPath = await extractJsonEntryFromZip(zipPath, tempDir);

  const fileStream = createReadStream(extractedPath);
  const p = parser();
  const filter = pick({ filter: "export.organes.organe" });
  const array = streamArray();

  await pipeline(fileStream, p, filter, array);

  for await (const chunk of array) {
    const parsed = parseOrgane(chunk.value as RawOrgane, legislature);
    if (parsed) yield parsed;
  }
}
