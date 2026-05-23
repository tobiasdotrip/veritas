import { readFile } from "node:fs/promises";
import { extractAllJsonFromZipDir } from "./zip-extract.js";

export interface RawScrutin {
  uid: string;
  numero?: string;
  legislature?: string;
  organeRef?: string;
  sessionRef?: string;
  seanceRef?: string;
  dateScrutin?: string;
  quantiemeJourSeance?: string;
  typeVote?: {
    codeTypeVote?: string;
    libelleTypeVote?: string;
    typeMajorite?: string;
  };
  sort?: { code?: string; libelle?: string };
  titre?: string;
  demandeur?: { texte?: string } | string;
  objet?: { libelle?: string } | string;
  modePublicationDesVotes?: string;
  ventilationVotes?: {
    organe?: {
      groupes?: {
        groupe?: RawGroupeVote | RawGroupeVote[];
      };
    };
  };
}

export interface RawScrutinFile {
  scrutin: RawScrutin;
}

interface RawGroupeVote {
  organeRef?: string;
  nombreMembresGroupe?: string;
  vote?: {
    positionMajoritaire?: string;
    decompteVoix?: {
      // Nouveau format (sans préfixe "nombre")
      pour?: string;
      contre?: string;
      abstentions?: string;
      nonVotants?: string;
      nonVotantsVolontaires?: string;
      // Ancien format (avec préfixe "nombre")
      nombrePour?: string;
      nombreContre?: string;
      nombreAbstentions?: string;
      nombreNonVotants?: string;
      nombreNonVotantsVolontaires?: string;
    };
    decompteNominatif?: {
      pours?: { votant?: RawVotant | RawVotant[] };
      contres?: { votant?: RawVotant | RawVotant[] };
      abstentions?: { votant?: RawVotant | RawVotant[] };
      nonVotants?: { votant?: RawVotant | RawVotant[] };
      nonVotantsVolontaires?: { votant?: RawVotant | RawVotant[] };
    };
  };
}

interface RawVotant {
  acteurRef?: string;
  mandatRef?: string;
  parDelegation?: string;
  causePositionVote?: string;
}

export interface ParsedVote {
  deputyId: string;
  mandateId: string;
  politicalGroupId: string;
  position: "pour" | "contre" | "abstention" | "nonVotant";
  parDelegation: boolean;
  causePositionVote?: string | undefined;
}

export interface ParsedGroupVote {
  politicalGroupId: string;
  nombreMembresGroupe?: number | undefined;
  positionMajoritaire?: string | undefined;
  nombrePour?: number | undefined;
  nombreContre?: number | undefined;
  nombreAbstentions?: number | undefined;
  nombreNonVotants?: number | undefined;
  nombreNonVotantsVolontaires?: number | undefined;
}

export interface ParsedScrutin {
  id: string;
  legislature: string;
  numero: number;
  organeRef?: string | undefined;
  sessionRef?: string | undefined;
  seanceRef?: string | undefined;
  dateScrutin: Date;
  quantiemeJourSeance?: number | undefined;
  codeTypeVote?: string | undefined;
  libelleTypeVote?: string | undefined;
  typeMajorite?: string | undefined;
  sortCode?: "adopté" | "rejeté" | undefined;
  sortLibelle?: string | undefined;
  titre: string;
  demandeur?: string | undefined;
  objet?: string | undefined;
  modePublicationDesVotes?: string | undefined;
  nombreVotants?: number | undefined;
  suffragesExprimes?: number | undefined;
  nombrePour?: number | undefined;
  nombreContre?: number | undefined;
  nombreAbstentions?: number | undefined;
  nombreNonVotants?: number | undefined;
  nombreNonVotantsVolontaires?: number | undefined;
  votes: ParsedVote[];
  groupVotes: ParsedGroupVote[];
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    if ("texte" in value) return String((value as { texte?: string }).texte);
    if ("libelle" in value)
      return String((value as { libelle?: string }).libelle);
  }
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

function parseVotants(votants?: RawVotant | RawVotant[]): ParsedVote[] {
  if (!votants) return [];
  const arr = Array.isArray(votants) ? votants : [votants];
  return arr
    .map((v) => ({
      deputyId: v.acteurRef ?? "UNKNOWN",
      mandateId: v.mandatRef ?? "UNKNOWN",
      politicalGroupId: "UNKNOWN",
      position: "nonVotant" as const,
      parDelegation: v.parDelegation === "oui" || v.parDelegation === "true",
      causePositionVote: v.causePositionVote,
    }))
    .filter((v) => v.deputyId !== "UNKNOWN" && v.mandateId !== "UNKNOWN");
}

function* extractVotesFromGroup(raw: RawScrutin): Generator<ParsedVote> {
  const groups = raw.ventilationVotes?.organe?.groupes?.groupe;
  if (!groups) return;
  for (const g of Array.isArray(groups) ? groups : [groups]) {
    const dn = g.vote?.decompteNominatif;
    if (!dn) continue;

    const groupId = g.organeRef ?? "UNKNOWN";

    const emit = function* (
      pos: ParsedVote["position"],
      list?: { votant?: RawVotant | RawVotant[] },
    ) {
      const votes = parseVotants(list?.votant);
      for (const v of votes) {
        yield {
          ...v,
          politicalGroupId: groupId,
          position: pos,
          causePositionVote:
            pos === "nonVotant" ? v.causePositionVote : undefined,
        };
      }
    };

    yield* emit("pour", dn.pours);
    yield* emit("contre", dn.contres);
    yield* emit("abstention", dn.abstentions);
    yield* emit("nonVotant", dn.nonVotants);
    yield* emit("nonVotant", dn.nonVotantsVolontaires);
  }
}

function* extractGroupVotes(raw: RawScrutin): Generator<ParsedGroupVote> {
  const groups = raw.ventilationVotes?.organe?.groupes?.groupe;
  if (!groups) return;
  for (const g of Array.isArray(groups) ? groups : [groups]) {
    const d = g.vote?.decompteVoix;
    yield {
      politicalGroupId: g.organeRef ?? "UNKNOWN",
      nombreMembresGroupe: toNumber(g.nombreMembresGroupe),
      positionMajoritaire: g.vote?.positionMajoritaire,
      nombrePour: toNumber(d?.pour ?? d?.nombrePour),
      nombreContre: toNumber(d?.contre ?? d?.nombreContre),
      nombreAbstentions: toNumber(d?.abstentions ?? d?.nombreAbstentions),
      nombreNonVotants: toNumber(d?.nonVotants ?? d?.nombreNonVotants),
      nombreNonVotantsVolontaires: toNumber(
        d?.nonVotantsVolontaires ?? d?.nombreNonVotantsVolontaires,
      ),
    };
  }
}

/**
 * Parse a single scrutin from the new-format JSON file ({scrutin: {...}}).
 */
export function parseScrutin(wrapper: RawScrutinFile): ParsedScrutin {
  const raw = wrapper.scrutin;
  const sortCode = raw.sort?.code;
  const votes = Array.from(extractVotesFromGroup(raw));
  const groupVotes = Array.from(extractGroupVotes(raw));

  // Global aggregates from group votes
  let nombrePour = 0;
  let nombreContre = 0;
  let nombreAbstentions = 0;
  let nombreNonVotants = 0;
  let nombreNonVotantsVolontaires = 0;
  for (const gv of groupVotes) {
    nombrePour += gv.nombrePour ?? 0;
    nombreContre += gv.nombreContre ?? 0;
    nombreAbstentions += gv.nombreAbstentions ?? 0;
    nombreNonVotants += gv.nombreNonVotants ?? 0;
    nombreNonVotantsVolontaires += gv.nombreNonVotantsVolontaires ?? 0;
  }

  // In new format, codeTypeVote/libelleTypeVote are nested in typeVote
  const codeTypeVote = raw.typeVote?.codeTypeVote;
  const libelleTypeVote = raw.typeVote?.libelleTypeVote;
  const typeMajorite = raw.typeVote?.typeMajorite;

  return {
    id: raw.uid,
    legislature: raw.legislature ?? "17",
    numero: toNumber(raw.numero) ?? 0,
    organeRef: raw.organeRef,
    sessionRef: raw.sessionRef,
    seanceRef: raw.seanceRef,
    dateScrutin: new Date(raw.dateScrutin ?? "1970-01-01"),
    quantiemeJourSeance: toNumber(raw.quantiemeJourSeance),
    codeTypeVote,
    libelleTypeVote,
    typeMajorite,
    sortCode:
      sortCode === "adopté" || sortCode === "rejeté" ? sortCode : undefined,
    sortLibelle: raw.sort?.libelle,
    titre: normalizeText(raw.titre) ?? raw.uid,
    demandeur: normalizeText(raw.demandeur),
    objet: normalizeText(raw.objet),
    modePublicationDesVotes: raw.modePublicationDesVotes,
    nombreVotants: undefined,
    suffragesExprimes: undefined,
    nombrePour: nombrePour || undefined,
    nombreContre: nombreContre || undefined,
    nombreAbstentions: nombreAbstentions || undefined,
    nombreNonVotants: nombreNonVotants || undefined,
    nombreNonVotantsVolontaires: nombreNonVotantsVolontaires || undefined,
    votes,
    groupVotes,
  };
}

/**
 * Parse all scrutins from a zip containing individual JSON files
 * (json/VTANR5L17V*.json).
 */
export async function* parseScrutinsFromZip(
  zipPath: string,
  tempDir: string,
): AsyncGenerator<ParsedScrutin> {
  const files = await extractAllJsonFromZipDir(zipPath, tempDir, "json");

  for (const filePath of files) {
    const raw = JSON.parse(await readFile(filePath, "utf-8")) as RawScrutinFile;
    if (!raw.scrutin) {
      console.warn(`[etl] Skipping non-scrutin JSON: ${filePath}`);
      continue;
    }
    yield parseScrutin(raw);
  }
}
