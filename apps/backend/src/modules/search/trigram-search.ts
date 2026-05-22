/** Seuil de similarité pg_trgm (extension déjà activée en CI et seed). */
export const TRIGRAM_SIMILARITY_THRESHOLD = 0.3;

/** Requêtes courtes (≤ 3 caractères) : to_tsquery est peu fiable, on bascule sur pg_trgm. */
export function shouldUseTrigramFallback(q: string): boolean {
  return q.trim().length > 0 && q.trim().length <= 3;
}
