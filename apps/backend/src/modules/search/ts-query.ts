/**
 * Builds a prefix tsquery string for PostgreSQL full-text search.
 * Each word is prefixed independently (e.g. "jean dup" → "jean:* & dup:*").
 */
export function toPrefixTsQuery(q: string): string {
  const safeQ = q.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  if (!safeQ) return "";
  return safeQ
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `${w}:*`)
    .join(" & ");
}
