import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ComparisonResult } from "@/lib/api-types";

export function useComparison(
  refSlug: string,
  compareSlugs: string[],
  period?: string
) {
  const params = new URLSearchParams();
  params.set("deputies", [refSlug, ...compareSlugs].join(","));
  if (period) params.set("from", period);
  return useQuery({
    queryKey: ["compare", refSlug, compareSlugs, period],
    queryFn: async () =>
      (await apiFetch<ComparisonResult>(`/compare?${params.toString()}`)).data,
    enabled: compareSlugs.length > 0,
    staleTime: Infinity,
  });
}
