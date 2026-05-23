import { createFileRoute, useParams } from "@tanstack/react-router";
import { apiFetch } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { ScrutinHeader } from "@/components/scrutin/ScrutinHeader";
import { VoteChart } from "@/components/scrutin/VoteChart";
import { GroupAccordion } from "@/components/scrutin/GroupAccordion";
import { VoteByDeputy } from "@/components/scrutin/VoteByDeputy";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShareButton } from "@/components/ui/ShareButton";
import * as Tabs from "@radix-ui/react-tabs";
import type { ScrutinDetail } from "@/lib/api-types";

export const Route = createFileRoute("/scrutin/$id")({
  component: ScrutinPage,
});

function useScrutin(id: string) {
  return useQuery({
    queryKey: ["scrutin", id],
    queryFn: async () =>
      (await apiFetch<ScrutinDetail>(`/scrutins/${id}`)).data,
    staleTime: 1000 * 60 * 30,
  });
}

function ScrutinPage() {
  const { id } = useParams({ from: "/scrutin/$id" });
  const {
    data: scrutin,
    isLoading: sLoading,
    error: sError,
    refetch: sRefetch,
  } = useScrutin(id);

  if (sLoading) {
    return (
      <div className="space-y-6 py-8">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={1} />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} lines={1} />
          ))}
        </div>
      </div>
    );
  }

  if (sError || !scrutin) {
    return (
      <div className="py-8">
        <ErrorFallback
          title="Erreur de chargement"
          description="Impossible de charger le scrutin."
          onRetry={() => sRefetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <ScrutinHeader scrutin={scrutin} className="flex-1" />
        <ShareButton
          url={`${typeof window !== "undefined" ? window.location.origin : ""}/scrutin/${id}`}
          title={`Scrutin n°${scrutin.numero} — ${scrutin.titre}`}
        />
      </div>

      <VoteChart
        pour={scrutin.nombrePour ?? 0}
        contre={scrutin.nombreContre ?? 0}
        abstentions={scrutin.nombreAbstentions ?? 0}
        nonVotants={scrutin.nombreNonVotants ?? 0}
      />

      {/* ── Onglets ── */}
      <Tabs.Root defaultValue="groupes" className="space-y-4">
        <Tabs.List className="inline-flex gap-1 rounded-lg border border-border-light bg-surface-raised p-1">
          <Tabs.Trigger
            value="groupes"
            className="rounded-md px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            Votes par groupe
          </Tabs.Trigger>
          <Tabs.Trigger
            value="deputes"
            className="rounded-md px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            Votes par député
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="groupes" className="space-y-3">
          {scrutin.groupVotes.length === 0 ? (
            <EmptyState
              title="Aucun groupe"
              description="Les données par groupe ne sont pas disponibles pour ce scrutin."
            />
          ) : (
            <GroupAccordion groups={scrutin.groupVotes} />
          )}
        </Tabs.Content>

        <Tabs.Content value="deputes">
          <VoteByDeputy scrutinId={id} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
