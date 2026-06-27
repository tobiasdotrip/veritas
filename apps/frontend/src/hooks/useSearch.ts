import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { SearchResultDepute, SearchResultScrutin } from "@/lib/api-types";

export function useSearch(q: string, theme?: string, limit = 20) {
  const params = new URLSearchParams();
  if (q.length >= 2) params.set("q", q);
  if (theme) params.set("theme", theme);
  params.set("limit", String(limit));

  return useQuery({
    queryKey: ["search", q, theme, limit],
    queryFn: async () =>
      (
        await apiFetch<{
          deputies: SearchResultDepute[];
          scrutins: SearchResultScrutin[];
        }>(`/search?${params.toString()}`)
      ).data,
    enabled: q.length >= 2 || !!theme,
    staleTime: 1000 * 60 * 2,
  });
}
