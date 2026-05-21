import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ComparisonResult } from "@/lib/api-types";
import type { Period } from "@/stores/comparator-store";

function periodToFrom(period: Period): string | undefined {
  if (period === "legislature") return undefined;
  const from = new Date();
  switch (period) {
    case "7j":
      from.setDate(from.getDate() - 7);
      break;
    case "30j":
      from.setDate(from.getDate() - 30);
      break;
    case "6mois":
      from.setMonth(from.getMonth() - 6);
      break;
  }
  return from.toISOString().slice(0, 10);
}

export function useComparison(
  refSlug: string,
  compareSlugs: string[],
  period?: Period,
) {
  const params = new URLSearchParams();
  params.set("deputies", [refSlug, ...compareSlugs].join(","));
  const from = period ? periodToFrom(period) : undefined;
  if (from) params.set("from", from);
  return useQuery({
    queryKey: ["compare", refSlug, compareSlugs, period],
    queryFn: async () =>
      (await apiFetch<ComparisonResult>(`/compare?${params.toString()}`)).data,
    enabled: compareSlugs.length > 0,
    staleTime: Infinity,
  });
}
