import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { DeputeVoteItem } from "@/lib/api-types";

export interface DeputeVotesFilters {
  from?: string | undefined;
  to?: string | undefined;
  type?: string | undefined;
  theme?: string | undefined;
  position?: string | undefined;
}

function buildVotesParams(
  filters: DeputeVotesFilters,
  cursor?: string,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.type) params.set("type", filters.type);
  if (filters.theme) params.set("theme", filters.theme);
  if (filters.position) params.set("position", filters.position);
  if (cursor) params.set("cursor", cursor);
  params.set("limit", "20");
  return params;
}

export function useDeputeVotes(slug: string, filters: DeputeVotesFilters) {
  return useInfiniteQuery({
    queryKey: ["depute", slug, "votes", filters],
    queryFn: ({ pageParam }) =>
      apiFetch<DeputeVoteItem[]>(
        `/deputies/${slug}/votes?${buildVotesParams(filters, pageParam).toString()}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta?.hasMore && lastPage.meta.nextCursor
        ? lastPage.meta.nextCursor
        : undefined,
    staleTime: 1000 * 60 * 10,
  });
}
