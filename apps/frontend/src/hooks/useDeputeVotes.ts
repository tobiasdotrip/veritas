import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { DeputeVoteItem } from "@/lib/api-types";

export interface DeputeVotesFilters {
  from?: string | undefined;
  to?: string | undefined;
  type?: string | undefined;
  theme?: string | undefined;
  position?: string | undefined;
}

export function useDeputeVotes(
  slug: string,
  filters: DeputeVotesFilters,
  cursor?: string
) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.type) params.set("type", filters.type);
  if (filters.theme) params.set("theme", filters.theme);
  if (filters.position) params.set("position", filters.position);
  if (cursor) params.set("cursor", cursor);
  params.set("limit", "20");

  return useQuery({
    queryKey: ["depute", slug, "votes", filters, cursor],
    queryFn: () =>
      apiFetch<{
        data: DeputeVoteItem[];
        meta: { nextCursor: string | null; hasMore: boolean };
      }>(`/deputies/${slug}/votes?${params.toString()}`),
    staleTime: 1000 * 60 * 10,
  });
}
