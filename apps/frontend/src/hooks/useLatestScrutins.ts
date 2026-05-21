import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { SearchResultScrutin } from "@/lib/api-types";

export function useLatestScrutins(limit = 6) {
  return useQuery({
    queryKey: ["scrutins", "latest", limit],
    queryFn: async () => {
      const res = await apiFetch<SearchResultScrutin[]>(
        `/scrutins?limit=${limit}&sort=date_desc`,
      );
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
