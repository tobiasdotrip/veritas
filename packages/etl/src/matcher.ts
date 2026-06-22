import * as schema from "@veritas/shared";
import type { LoaderDeps } from "./loader.js";
import type { ParsedDossierLegislatif } from "./parser/dossiers.js";

// ─── Regex ───────────────────────────────────────────────────────

/**
 * Extracts amendment number from a scrutin title.
 */
const AMENDMENT_NUMBER_RE =
  /(?:l['\u2019]amendement|le sous-amendement|l['\u2019]amendement de suppression)\b.*?\s+n[°o]\s*(\d+)/i;

export function extractAmendmentNumber(titre: string): number | undefined {
  const match = titre.match(AMENDMENT_NUMBER_RE);
  if (!match?.[1]) return undefined;
  const n = Number(match[1]);
  return Number.isNaN(n) ? undefined : n;
}

export function normalizeAmendmentNumero(numero: string): string {
  return numero.replace(/\s*\(?rect\.?\)?$/i, "").trim();
}

function titleMentionsRect(titre: string): boolean {
  return /\brect\.?\b/i.test(titre);
}

/**
 * Extracts the law name from a scrutin title.
 * Matches patterns like:
 *   "du projet de loi de finances pour 2026"
 *   "de la proposition de loi visant à ..."
 */
const LAW_NAME_RE =
  /(?:du|de la)\s+(?:projet|proposition)\s+de\s+loi\s+(.+?)(?=\s*\((?:premi[èe]re|nouvelle|seconde|1[èe]re|2nde)\s+lecture\)|\.?$)/i;

export function extractLawName(titre: string): string | undefined {
  const match = titre.match(LAW_NAME_RE);
  if (!match?.[1]) return undefined;
  return match[1].trim();
}

/**
 * Extracts article reference from a scrutin title.
 * Matches patterns like:
 *   "à l'article 2"
 *   "après l'article 3 bis"
 *   "de l'article premier"
 */
const ARTICLE_RE =
  /(?:à|après|de)\s+l['\u2019]article\s+([\w\s]+?)(?:\s+(?:du|de la)\s+(?:projet|proposition)\s+de\s+loi|\s*\(|\s*$)/i;

function extractArticleFromTitle(titre: string): string | undefined {
  const match = titre.match(ARTICLE_RE);
  if (!match?.[1]) return undefined;
  return match[1].trim().toLowerCase();
}

function normalizeForFuzzy(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccardScore(a: string, b: string): number {
  const sa = new Set(a.split(/\s+/).filter(Boolean));
  const sb = new Set(b.split(/\s+/).filter(Boolean));
  if (sa.size === 0 || sb.size === 0) return 0;
  const intersection = new Set([...sa].filter((x) => sb.has(x)));
  return intersection.size / (sa.size + sb.size - intersection.size);
}

/**
 * Combined similarity that boosts Jaccard when one string is a
 * substring of the other (common for abbreviated law names).
 */
function combinedSimilarity(a: string, b: string): number {
  const jac = jaccardScore(a, b);
  // Substring bonus: if one is contained in the other, boost score
  let bonus = 0;
  if (a.length > 3 && b.length > 3) {
    if (a.includes(b) || b.includes(a)) {
      bonus = 0.15;
    }
  }
  return Math.min(1, jac + bonus);
}

/**
 * Finds the author reference in a scrutin title by looking for
 * deputy last names after "de/du" markers.
 * Handles compound names like "Le Fur", "de Montesquiou".
 */
function findAuthorInTitle(
  titre: string,
  deputyLastNames: Set<string>,
): string | undefined {
  // Extract text after "de/du" up to next structural marker
  const match = titre.match(
    /(?:de|du)\s+(.*?)(?=\s+(?:à|après|et\s+les|et\s+l['\u2019]|sur\s+l['\u2019]|de\s+la\s+commission|de\s+M\.\s*\w+\s+et\s+les))/i,
  );
  if (!match?.[1]) return undefined;

  const text = normalizeForFuzzy(match[1]).replace(/^m(?:me|\.\s*)\s*/i, "");
  const words = text.split(/\s+/).filter(Boolean);

  // Check single words and adjacent pairs (for compound last names)
  for (let i = 0; i < words.length; i++) {
    // Skip common first-name-like words when checking single words
    // (but still check pairs that include them)
    if (deputyLastNames.has(words[i]!) && words[i]!.length >= 3) {
      return words[i];
    }
    if (i + 1 < words.length) {
      const pair = `${words[i]} ${words[i + 1]}`;
      if (deputyLastNames.has(pair)) {
        return pair;
      }
    }
  }

  // Special cases
  if (text.includes("gouvernement")) return "gouvernement";
  if (text.includes("commission")) return "commission";
  if (text.includes("rapporteur")) return "rapporteur";

  return undefined;
}

// ─── Config ──────────────────────────────────────────────────────

export interface MatchConfig {
  /** Minimum confidence for direct dossierRef matches */
  dossierRefConfidence: number;
  /** Minimum confidence for fuzzy title matches */
  titreConfidence: number;
  /** Minimum similarity score for fuzzy matching */
  fuzzyThreshold: number;
  /** Gap required between top 2 fuzzy scores to accept a unique match */
  fuzzyGap: number;
  /** Minimum confidence for author-direct matches */
  authorConfidence: number;
}

const DEFAULT_MATCH_CONFIG: MatchConfig = {
  dossierRefConfidence: 0.95,
  titreConfidence: 0.75,
  fuzzyThreshold: 0.6,
  fuzzyGap: 0.01,
  authorConfidence: 0.65,
};

// ─── Types ───────────────────────────────────────────────────────

export interface MatchResult {
  matched: number;
  skipped: number;
  noAmendmentNumber: number;
  noMatch: number;
  multipleMatches: number;
}

type AmendmentCandidate = {
  id: string;
  numero: string;
  dossierRef: string;
  articleRef: string | null;
  auteurs: unknown;
};

// ─── Helpers ─────────────────────────────────────────────────────

export function pickCandidateForScrutinTitle(
  candidates: AmendmentCandidate[],
  titre: string,
): AmendmentCandidate | undefined {
  const wantsRect = titleMentionsRect(titre);
  const matchesByRect = candidates.filter(
    (candidate) =>
      /\s*\(?rect\.?\)?$/i.test(candidate.numero) === wantsRect,
  );

  if (matchesByRect.length === 1) {
    return matchesByRect[0];
  }

  return undefined;
}

function disambiguateByArticle(
  candidates: AmendmentCandidate[],
  titre: string,
): AmendmentCandidate | undefined {
  const articleHint = extractArticleFromTitle(titre);
  if (!articleHint) return undefined;

  const matches = candidates.filter((c) => {
    if (!c.articleRef) return false;
    const art = c.articleRef.toLowerCase().replace(/\s+/g, " ").trim();
    return art.includes(articleHint) || articleHint.includes(art);
  });

  return matches.length === 1 ? matches[0] : undefined;
}

function getAuthorLastName(
  candidate: AmendmentCandidate,
  deputyNamesById: Map<string, string>,
): string | undefined {
  const auteurs = candidate.auteurs as
    | Array<{ type: string; acteurRef?: string | { "@xsi:nil"?: string } }>
    | null;
  if (!auteurs || auteurs.length === 0) return undefined;

  const firstAuthor = auteurs[0];
  if (!firstAuthor) return undefined;

  // Special cases for non-deputy authors
  if (firstAuthor.type === "Gouvernement") return "gouvernement";
  if (firstAuthor.type === "Commission") return "commission";
  if (firstAuthor.type === "Rapporteur") return "rapporteur";

  if (!firstAuthor.acteurRef || typeof firstAuthor.acteurRef !== "string") {
    return undefined;
  }

  return deputyNamesById.get(firstAuthor.acteurRef);
}

function disambiguateByAuthor(
  candidates: AmendmentCandidate[],
  titre: string,
  deputyNamesById: Map<string, string>,
  deputyLastNames: Set<string>,
): AmendmentCandidate | undefined {
  const authorHint = findAuthorInTitle(titre, deputyLastNames);
  if (!authorHint) return undefined;

  const matches = candidates.filter((c) => {
    const authorName = getAuthorLastName(c, deputyNamesById);
    if (!authorName) return false;
    return authorName.includes(authorHint) || authorHint.includes(authorName);
  });

  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Returns the "legislature" number from a dossierRef.
 * DLR5L17N12345 → 17, DLR5L16N12345 → 16
 */
function getLegislatureFromDossierRef(dossierRef: string): number {
  const m = dossierRef.match(/DLR5L(\d+)/);
  return m && m[1] ? parseInt(m[1], 10) : 0;
}

/**
 * Prefer legislature 17 candidates over legislature 16.
 */
function preferL17(candidates: AmendmentCandidate[]): AmendmentCandidate[] {
  const l17 = candidates.filter(
    (c) => getLegislatureFromDossierRef(c.dossierRef) === 17,
  );
  return l17.length > 0 ? l17 : candidates;
}

/**
 * Resolve a list of candidates using disambiguation signals.
 * Tries all candidates first, then falls back to L17-only if ambiguous.
 */
function resolveCandidate(
  candidates: AmendmentCandidate[],
  titre: string,
  deputyNamesById: Map<string, string>,
  deputyLastNames: Set<string>,
): AmendmentCandidate | undefined {
  // Try disambiguation on all candidates
  const allMatch =
    pickCandidateForScrutinTitle(candidates, titre) ??
    disambiguateByArticle(candidates, titre) ??
    disambiguateByAuthor(candidates, titre, deputyNamesById, deputyLastNames);
  if (allMatch) return allMatch;

  // If still ambiguous, try with L17 preference
  const l17 = preferL17(candidates);
  if (l17.length === 1) return l17[0];

  const l17Match =
    pickCandidateForScrutinTitle(l17, titre) ??
    disambiguateByArticle(l17, titre) ??
    disambiguateByAuthor(l17, titre, deputyNamesById, deputyLastNames);
  return l17Match ?? undefined;
}

// ─── Matching ────────────────────────────────────────────────────

/**
 * Matches scrutins to amendments in four phases:
 *
 * Phase A (dossierRef): For scrutins with dossierRef, match by
 *   (dossierRef, numero) with high confidence.
 *
 * Phase B (titre): For remaining unmatched scrutins, fuzzy-match
 *   the law name from the scrutin title against legislative dossier
 *   titles to find a dossierRef, then match by (dossierRef, numero).
 *
 * Phase C (author-direct): For remaining scrutins, match directly
 *   by (author last name, numero) using the deputies table.
 *
 * Phase D (disambiguation): For cases with multiple candidates in
 *   any phase, try to disambiguate by article reference, rectification,
 *   or author name.
 */
export async function runAmendmentMatching(
  deps: LoaderDeps,
  dossiers?: ParsedDossierLegislatif[],
  config: MatchConfig = DEFAULT_MATCH_CONFIG,
): Promise<MatchResult> {
  const result: MatchResult = {
    matched: 0,
    skipped: 0,
    noAmendmentNumber: 0,
    noMatch: 0,
    multipleMatches: 0,
  };

  // ─── Load all scrutins ───────────────────────────────────────
  const allScrutins = await deps.db
    .select({
      id: schema.scrutins.id,
      titre: schema.scrutins.titre,
      dossierRef: schema.scrutins.dossierRef,
    })
    .from(schema.scrutins);

  if (allScrutins.length === 0) {
    console.log("[matcher] No scrutins found, skipping matching");
    return result;
  }

  // ─── Load all amendments ─────────────────────────────────────
  const allAmendments = await deps.db
    .select({
      id: schema.amendments.id,
      numero: schema.amendments.numero,
      dossierRef: schema.amendments.dossierRef,
      articleRef: schema.amendments.articleRef,
      auteurs: schema.amendments.auteurs,
    })
    .from(schema.amendments);

  if (allAmendments.length === 0) {
    console.log("[matcher] No amendments found, skipping matching");
    return result;
  }

  // Index amendments by normalized numero
  const amendmentsByNumero = new Map<string, AmendmentCandidate[]>();
  for (const a of allAmendments) {
    const num = normalizeAmendmentNumero(a.numero);
    const list = amendmentsByNumero.get(num) ?? [];
    list.push(a);
    amendmentsByNumero.set(num, list);
  }

  // Index amendments by (dossierRef, normalized numero)
  const amendmentsByDossierNumero = new Map<string, AmendmentCandidate[]>();
  for (const a of allAmendments) {
    const num = normalizeAmendmentNumero(a.numero);
    const key = `${a.dossierRef}|${num}`;
    const list = amendmentsByDossierNumero.get(key) ?? [];
    list.push(a);
    amendmentsByDossierNumero.set(key, list);
  }

  // Load already matched scrutin IDs to avoid re-matching
  const alreadyMatchedRes = await deps.db
    .select({ scrutinId: schema.scrutinAmendments.scrutinId })
    .from(schema.scrutinAmendments);
  const alreadyMatchedIds = new Set(alreadyMatchedRes.map((r) => r.scrutinId));

  // ─── Build fuzzy index for dossiers ──────────────────────────
  const dossierIndex: Array<{
    dossierRef: string;
    titreNormalized: string;
    legislature: string;
  }> = [];
  if (dossiers && dossiers.length > 0) {
    for (const d of dossiers) {
      dossierIndex.push({
        dossierRef: d.dossierRef,
        titreNormalized: normalizeForFuzzy(d.titre),
        legislature: d.legislature,
      });
    }
  }

  // ─── Deputy names for author disambiguation ──────────────────
  const deputyNamesById = new Map<string, string>();
  const deputyLastNames = new Set<string>();
  try {
    const deputiesRes = await deps.db
      .select({
        id: schema.deputies.id,
        lastName: schema.deputies.lastName,
      })
      .from(schema.deputies);
    for (const d of deputiesRes) {
      const normalizedLastName = normalizeForFuzzy(d.lastName);
      deputyNamesById.set(d.id, normalizedLastName);
      deputyLastNames.add(normalizedLastName);
    }
  } catch {
    // deputies table may be empty during tests
  }

  // ─── Phase A: Direct dossierRef matching ─────────────────────
  const phaseABatch: Array<{
    scrutinId: string;
    amendmentId: string;
    confidence: string;
  }> = [];

  for (const s of allScrutins) {
    if (alreadyMatchedIds.has(s.id)) continue;

    const num = extractAmendmentNumber(s.titre);
    if (num === undefined) {
      result.noAmendmentNumber++;
      continue;
    }

    if (!s.dossierRef) {
      // Will be handled in Phase B
      continue;
    }

    const key = `${s.dossierRef}|${String(num)}`;
    const candidates = amendmentsByDossierNumero.get(key);
    if (!candidates || candidates.length === 0) {
      result.noMatch++;
      continue;
    }

    const match = resolveCandidate(
      candidates,
      s.titre,
      deputyNamesById,
      deputyLastNames,
    );
    if (match) {
      phaseABatch.push({
        scrutinId: s.id,
        amendmentId: match.id,
        confidence: String(config.dossierRefConfidence),
      });
    } else {
      result.multipleMatches++;
    }
  }

  if (phaseABatch.length > 0) {
    try {
      await deps.db.insert(schema.scrutinAmendments).values(
        phaseABatch.map((m) => ({
          scrutinId: m.scrutinId,
          amendmentId: m.amendmentId,
          matchMethod: "dossierRef" as const,
          confidence: m.confidence,
          createdAt: new Date(),
        })),
      );
      result.matched += phaseABatch.length;
      console.log(
        `[matcher] Phase A (dossierRef): ${phaseABatch.length} matches inserted`,
      );
      for (const m of phaseABatch) {
        alreadyMatchedIds.add(m.scrutinId);
      }
    } catch (err) {
      console.error(
        `[matcher] Phase A insert failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // ─── Phase B: Fuzzy title matching ───────────────────────────
  const phaseBBatch: Array<{
    scrutinId: string;
    amendmentId: string;
    confidence: string;
  }> = [];

  if (dossierIndex.length > 0) {
    for (const s of allScrutins) {
      if (alreadyMatchedIds.has(s.id)) continue;

      const num = extractAmendmentNumber(s.titre);
      if (num === undefined) continue;

      const lawName = extractLawName(s.titre);
      if (!lawName) continue;

      const normalizedLawName = normalizeForFuzzy(lawName);
      const scores: Array<{
        score: number;
        dossierRef: string;
        legislature: string;
      }> = [];

      for (const d of dossierIndex) {
        const score = combinedSimilarity(normalizedLawName, d.titreNormalized);
        if (score >= config.fuzzyThreshold) {
          scores.push({ score, dossierRef: d.dossierRef, legislature: d.legislature });
        }
      }

      scores.sort((a, b) => b.score - a.score);

      let selectedDossierRef: string | undefined;
      if (scores.length === 1) {
        selectedDossierRef = scores[0]!.dossierRef;
      } else if (scores.length >= 2) {
        const gap = scores[0]!.score - scores[1]!.score;
        if (gap >= config.fuzzyGap) {
          selectedDossierRef = scores[0]!.dossierRef;
        } else if (scores[0]!.score >= 0.8) {
          // High-confidence match: accept even with small gap
          selectedDossierRef = scores[0]!.dossierRef;
        }
        // If multiple dossiers with similar scores, skip (ambiguous)
      }

      if (!selectedDossierRef) {
        result.skipped++;
        continue;
      }

      const key = `${selectedDossierRef}|${String(num)}`;
      const candidates = amendmentsByDossierNumero.get(key);
      if (!candidates || candidates.length === 0) {
        result.noMatch++;
        continue;
      }

      const match = resolveCandidate(
        candidates,
        s.titre,
        deputyNamesById,
        deputyLastNames,
      );
      if (match) {
        phaseBBatch.push({
          scrutinId: s.id,
          amendmentId: match.id,
          confidence: String(config.titreConfidence),
        });
      } else {
        result.multipleMatches++;
      }
    }
  }

  if (phaseBBatch.length > 0) {
    try {
      await deps.db
        .insert(schema.scrutinAmendments)
        .values(
          phaseBBatch.map((m) => ({
            scrutinId: m.scrutinId,
            amendmentId: m.amendmentId,
            matchMethod: "titre" as const,
            confidence: m.confidence,
            createdAt: new Date(),
          })),
        )
        .onConflictDoNothing();
      result.matched += phaseBBatch.length;
      console.log(
        `[matcher] Phase B (titre): ${phaseBBatch.length} matches inserted`,
      );
      for (const m of phaseBBatch) {
        alreadyMatchedIds.add(m.scrutinId);
      }
    } catch (err) {
      console.error(
        `[matcher] Phase B insert failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // ─── Phase C: author-direct matching ─────────────────────────
  // Match scrutins directly by (author last name, numero) when
  // fuzzy title matching failed or was ambiguous.
  const phaseCBatch: Array<{
    scrutinId: string;
    amendmentId: string;
    confidence: string;
  }> = [];

  // Build amendment index by (authorLastName, normalizedNumero)
  const amendmentsByAuthorNumero = new Map<string, AmendmentCandidate[]>();
  for (const a of allAmendments) {
    const authorName = getAuthorLastName(a, deputyNamesById);
    if (!authorName) continue;
    const num = normalizeAmendmentNumero(a.numero);
    const key = `${authorName}|${num}`;
    const list = amendmentsByAuthorNumero.get(key) ?? [];
    list.push(a);
    amendmentsByAuthorNumero.set(key, list);
  }

  for (const s of allScrutins) {
    if (alreadyMatchedIds.has(s.id)) continue;

    const num = extractAmendmentNumber(s.titre);
    if (num === undefined) continue;

    const authorHint = findAuthorInTitle(s.titre, deputyLastNames);
    if (!authorHint) {
      // Skip author-direct matching if no author in title
      result.skipped++;
      continue;
    }

    const key = `${authorHint}|${String(num)}`;
    const candidates = amendmentsByAuthorNumero.get(key);
    if (!candidates || candidates.length === 0) {
      result.noMatch++;
      continue;
    }

    const match = resolveCandidate(
      candidates,
      s.titre,
      deputyNamesById,
      deputyLastNames,
    );
    if (match) {
      phaseCBatch.push({
        scrutinId: s.id,
        amendmentId: match.id,
        confidence: String(config.authorConfidence),
      });
    } else {
      result.multipleMatches++;
    }
  }

  if (phaseCBatch.length > 0) {
    try {
      await deps.db
        .insert(schema.scrutinAmendments)
        .values(
          phaseCBatch.map((m) => ({
            scrutinId: m.scrutinId,
            amendmentId: m.amendmentId,
            matchMethod: "auteur" as const,
            confidence: m.confidence,
            createdAt: new Date(),
          })),
        )
        .onConflictDoNothing();
      result.matched += phaseCBatch.length;
      console.log(
        `[matcher] Phase C (author): ${phaseCBatch.length} matches inserted`,
      );
      for (const m of phaseCBatch) {
        alreadyMatchedIds.add(m.scrutinId);
      }
    } catch (err) {
      console.error(
        `[matcher] Phase C insert failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  console.log(
    `[matcher] Summary: ${result.matched} matched, ${result.skipped} skipped, ` +
      `${result.noAmendmentNumber} no amendment number in title, ` +
      `${result.noMatch} no matching amendment, ` +
      `${result.multipleMatches} multiple candidates unresolved`,
  );

  return result;
}
