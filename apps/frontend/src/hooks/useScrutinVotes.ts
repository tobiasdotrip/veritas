import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ScrutinIndividualVote } from "@/lib/api-types";

export function useScrutinVotes(
  scrutinId: string,
  position?: "pour" | "contre" | "abstention" | "nonVotant",
) {
  return useQuery({
    queryKey: ["scrutin-votes", scrutinId, position],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "600");
      params.set("offset", "0");
      if (position) params.set("position", position);
      const res = await apiFetch<ScrutinIndividualVote[]>(
        `/scrutins/${scrutinId}/votes?${params.toString()}`,
      );
      return res.data;
    },
    staleTime: 1000 * 60 * 30,
    enabled: !!scrutinId,
  });
}
