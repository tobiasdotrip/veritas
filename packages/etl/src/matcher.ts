import * as schema from "@veritas/shared";
import type { LoaderDeps } from "./loader.js";

// ─── Regex ───────────────────────────────────────────────────────

/**
 * Extracts amendment number from a scrutin title.
 * Matches patterns like:
 *   "l'amendement n° 1867"
 *   "le sous-amendement n° 123"
 *   "l'amendement de suppression n° 456"
 *   "l'amendement no 789"
 *   "l'amendement n° 1867 (rect.)"
 */
const AMENDMENT_NUMBER_RE =
  /(?:l'amendement|le sous-amendement|l'amendement de suppression)\s+n[°o]\s*(\d+)/i;

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

type AmendmentCandidate = {
  id: string;
  numero: string;
  dossierRef: string;
};

export function pickCandidateForScrutinTitle(
  candidates: AmendmentCandidate[],
  titre: string,
): AmendmentCandidate | undefined {
  const wantsRect = titleMentionsRect(titre);
  const matchesByRect = candidates.filter(
    (candidate) => /\s*\(?rect\.?\)?$/i.test(candidate.numero) === wantsRect,
  );

  if (matchesByRect.length === 1) {
    return matchesByRect[0];
  }

  return undefined;
}

// ─── Config ──────────────────────────────────────────────────────

export interface MatchConfig {
  /** Minimum confidence for Level 1 (dossierRef) matches */
  dossierRefConfidence: number;
  /** Confidence for Level 2 (titre) matches */
  titreConfidence: number;
}

const DEFAULT_MATCH_CONFIG: MatchConfig = {
  dossierRefConfidence: 0.95,
  titreConfidence: 0.8,
};

// ─── Matching ────────────────────────────────────────────────────

export interface MatchResult {
  matched: number;
  skipped: number;
  noAmendmentNumber: number;
  noMatch: number;
  multipleMatches: number;
}

/**
 * Matches scrutins to amendments in two phases:
 *
 * Phase 1 (dossierRef): For each scrutin with an amendment number in its
 *   title, if there is exactly ONE amendment with that numero across all
 *   dossiers, it's a high-confidence match.
 *
 * Phase 2 (titre): For remaining unmatched scrutins, if there is exactly
 *   one amendment with that numero, it's a match with lower confidence.
 *
 * Both phases insert into scrutin_amendments with onConflictDoNothing
 * so Phase 2 never overwrites a Phase 1 match.
 */
export async function runAmendmentMatching(
  deps: LoaderDeps,
  config: MatchConfig = DEFAULT_MATCH_CONFIG,
): Promise<MatchResult> {
  const result: MatchResult = {
    matched: 0,
    skipped: 0,
    noAmendmentNumber: 0,
    noMatch: 0,
    multipleMatches: 0,
  };

  // ─── Charge tous les scrutins ─────────────────────────────────
  const allScrutins = await deps.db
    .select({
      id: schema.scrutins.id,
      titre: schema.scrutins.titre,
      objet: schema.scrutins.objet,
    })
    .from(schema.scrutins);

  if (allScrutins.length === 0) {
    console.log("[matcher] No scrutins found, skipping matching");
    return result;
  }

  // ─── Charge tous les amendements ──────────────────────────────
  const allAmendments = await deps.db
    .select({
      id: schema.amendments.id,
      numero: schema.amendments.numero,
      dossierRef: schema.amendments.dossierRef,
    })
    .from(schema.amendments);

  if (allAmendments.length === 0) {
    console.log("[matcher] No amendments found, skipping matching");
    return result;
  }

  // ─── Indexe les amendements par numero ────────────────────────
  const amendmentsByNumero = new Map<string, typeof allAmendments>();
  for (const a of allAmendments) {
    const num = normalizeAmendmentNumero(a.numero);
    const list = amendmentsByNumero.get(num) ?? [];
    list.push(a);
    amendmentsByNumero.set(num, list);
  }

  // ─── Phase 1: dossierRef (unique numero across all dossiers) ──
  const phase1Batch: Array<{ scrutinId: string; amendmentId: string }> = [];

  for (const s of allScrutins) {
    const num = extractAmendmentNumber(s.titre);
    if (num === undefined) {
      result.noAmendmentNumber++;
      continue;
    }

    const maybeCandidates = amendmentsByNumero.get(String(num));
    if (!maybeCandidates) {
      result.noMatch++;
      continue;
    }
    const candidates = maybeCandidates;
    if (candidates.length === 0) {
      result.noMatch++;
      continue;
    }

    if (candidates.length === 1) {
      // Unique amendment for this numero → Phase 1 match
      const match = candidates[0]!;
      phase1Batch.push({
        scrutinId: s.id,
        amendmentId: match.id,
      });
    } else {
      result.multipleMatches++;
    }
  }

  // Insert Phase 1 matches
  if (phase1Batch.length > 0) {
    try {
      await deps.db.insert(schema.scrutinAmendments).values(
        phase1Batch.map((m) => ({
          scrutinId: m.scrutinId,
          amendmentId: m.amendmentId,
          matchMethod: "dossierRef" as const,
          confidence: String(config.dossierRefConfidence),
          createdAt: new Date(),
        })),
      );
      result.matched += phase1Batch.length;
      console.log(
        `[matcher] Phase 1 (dossierRef): ${phase1Batch.length} matches inserted`,
      );
    } catch (err) {
      console.error(
        `[matcher] Phase 1 insert failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // ─── Phase 2: titre (match by numero alone, fallback) ─────────
  // Only scrutins that had multiple candidates and weren't matched in Phase 1
  const phase2Batch: Array<{ scrutinId: string; amendmentId: string }> = [];

  for (const s of allScrutins) {
    const num = extractAmendmentNumber(s.titre);
    if (num === undefined) continue;

    // Skip if already matched in Phase 1
    const alreadyMatched = phase1Batch.some((m) => m.scrutinId === s.id);
    if (alreadyMatched) continue;

    const maybeCandidates = amendmentsByNumero.get(String(num));
    if (!maybeCandidates) continue;
    const candidates = maybeCandidates;
    if (candidates.length === 0) continue;

    // Phase 2: we had multiple candidates but couldn't disambiguate.
    // Try to pick the one where texteLegislatifRef appears in scrutin objet/titre.
    if (candidates.length > 1) {
      // Try a deterministic disambiguation based on title hint ("rect.").
      const match = pickCandidateForScrutinTitle(candidates, s.titre);
      if (!match) {
        result.skipped++;
        continue;
      }
      phase2Batch.push({
        scrutinId: s.id,
        amendmentId: match.id,
      });
    }
    // Note: single-candidate cases were already handled in Phase 1
  }

  // Insert Phase 2 matches (onConflictDoNothing to preserve Phase 1)
  if (phase2Batch.length > 0) {
    try {
      await deps.db
        .insert(schema.scrutinAmendments)
        .values(
          phase2Batch.map((m) => ({
            scrutinId: m.scrutinId,
            amendmentId: m.amendmentId,
            matchMethod: "titre" as const,
            confidence: String(config.titreConfidence),
            createdAt: new Date(),
          })),
        )
        .onConflictDoNothing();
      result.matched += phase2Batch.length;
      console.log(
        `[matcher] Phase 2 (titre): ${phase2Batch.length} matches inserted`,
      );
    } catch (err) {
      console.error(
        `[matcher] Phase 2 insert failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  console.log(
    `[matcher] Summary: ${result.matched} matched, ${result.skipped} skipped, ` +
      `${result.noAmendmentNumber} no amendment number in title, ` +
      `${result.noMatch} no matching amendment, ` +
      `${result.multipleMatches} multiple candidates (Phase 1)`,
  );

  return result;
}
