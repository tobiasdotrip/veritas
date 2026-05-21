import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { SearchResultScrutin } from "@/lib/api-types";

export function useThemeScrutins(theme: string | undefined, limit = 20) {
  const params = new URLSearchParams();
  if (theme) params.set("theme", theme);
  params.set("limit", String(limit));
  params.set("sort", "date_desc");

  return useQuery({
    queryKey: ["scrutins", "theme", theme, limit],
    queryFn: async () =>
      (await apiFetch<SearchResultScrutin[]>(`/scrutins?${params.toString()}`))
        .data,
    enabled: !!theme,
    staleTime: 1000 * 60 * 5,
  });
}
