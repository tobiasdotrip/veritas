import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { SearchResultDepute, SearchResultScrutin } from "@/lib/api-types";

export type SearchType = "depute" | "scrutin" | "all";

export function useSearch(
  q: string,
  type: SearchType = "all",
  offset = 0,
  limit = 20
) {
  const params = new URLSearchParams();
  if (q.length >= 2) params.set("q", q);
  params.set("type", type);
  params.set("offset", String(offset));
  params.set("limit", String(limit));

  return useQuery({
    queryKey: ["search", q, type, offset, limit],
    queryFn: () =>
      apiFetch<{
        deputies: SearchResultDepute[];
        scrutins: SearchResultScrutin[];
        meta: { total: number; hasMore: boolean };
      }>(`/search?${params.toString()}`),
    enabled: q.length >= 2,
    staleTime: 1000 * 60 * 2,
  });
}
