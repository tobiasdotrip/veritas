/**
 * Builds a prefix tsquery string for PostgreSQL full-text search.
 * Each word is prefixed independently (e.g. "jean dup" → "jean:* & dup:*").
 */
export function toPrefixTsQuery(q: string): string {
  // Keep letters, numbers, whitespace and hyphens. Hyphens are part of
  // PostgreSQL to_tsvector tokens (e.g. "jean-michel" is a single token).
  const safeQ = q.replace(/[^\p{L}\p{N}\s-]/gu, "").trim();
  if (!safeQ) return "";
  return safeQ
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      // Collapse repeated hyphens, strip leading/trailing hyphens
      const cleaned = w.replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
      return cleaned;
    })
    .filter(Boolean)
    .map((w) => `${w}:*`)
    .join(" & ");
}
