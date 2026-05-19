import { useQuery, queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { DeputeProfile } from "@/lib/api-types";

export function deputeQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["depute", slug],
    queryFn: () => apiFetch<DeputeProfile>(`/deputies/${slug}`),
    staleTime: 1000 * 60 * 60,
  });
}

export function useDepute(slug: string) {
  return useQuery(deputeQueryOptions(slug));
}
