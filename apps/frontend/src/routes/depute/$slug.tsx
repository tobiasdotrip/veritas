import {
  createFileRoute,
  useParams,
  useSearch,
  useNavigate,
} from "@tanstack/react-router";
import { useDepute } from "@/hooks/useDepute";
import { useDeputeVotes } from "@/hooks/useDeputeVotes";
import { DeputeHeader } from "@/components/depute/DeputeHeader";
import { KPIGrid } from "@/components/depute/KPIGrid";
import { VoteTimeline } from "@/components/depute/VoteTimeline";
import { VoteFilters } from "@/components/depute/VoteFilters";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { Button } from "@/components/ui/Button";
import { ShareButton } from "@/components/ui/ShareButton";
import type { VoteFiltersState } from "@/components/depute/VoteFilters";
import { useComparatorStore } from "@/stores/comparator-store";
import { Scale } from "lucide-react";
import { type DeputeSearch } from "@/lib/route-search";

function validateSearch(search: Record<string, unknown>): DeputeSearch {
  return {
    from: typeof search.from === "string" ? search.from : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
    type: typeof search.type === "string" ? search.type : undefined,
    theme: typeof search.theme === "string" ? search.theme : undefined,
    position: typeof search.position === "string" ? search.position : undefined,
  };
}

export const Route = createFileRoute("/depute/$slug")({
  component: DeputePage,
  validateSearch,
});

function DeputePage() {
  const { slug } = useParams({ from: "/depute/$slug" });
  const urlSearch = useSearch({ from: "/depute/$slug" });
  const filters: VoteFiltersState = {
    from: urlSearch.from,
    to: urlSearch.to,
    type: urlSearch.type,
    theme: urlSearch.theme,
    position: urlSearch.position,
  };

  const { data: depute, isLoading, error, refetch } = useDepute(slug);
  const {
    data: votesPages,
    isLoading: votesLoading,
    error: votesError,
    refetch: refetchVotes,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDeputeVotes(slug, filters);

  const votes = votesPages?.pages.flatMap((page) => page.data) ?? [];

  const navigate = useNavigate({ from: "/depute/$slug" });
  const setReference = useComparatorStore((s) => s.setReference);

  if (isLoading) {
    return (
      <div className="space-y-6 py-8">
        <SkeletonCard lines={2} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-neutral-bg"
            />
          ))}
        </div>
        <SkeletonCard lines={3} />
      </div>
    );
  }

  if (error || !depute) {
    return (
      <div className="py-8">
        <ErrorFallback
          title="Erreur de chargement"
          description="Impossible de charger la fiche député."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <DeputeHeader depute={depute} className="flex-1" />
        <div className="flex flex-col gap-2">
          <ShareButton
            url={`${typeof window !== "undefined" ? window.location.origin : ""}/depute/${slug}`}
            title={`${depute.firstName} ${depute.lastName} — Fiche député`}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const summary = {
                id: depute.id,
                firstName: depute.firstName,
                lastName: depute.lastName,
                slug: depute.slug,
                photoUrl: depute.photoUrl,
                groupAbbreviation: depute.groupAbbreviation,
              };
              setReference(summary);
            }}
          >
            <Scale className="h-4 w-4" aria-hidden="true" />
            Comparer
          </Button>
        </div>
      </div>

      <KPIGrid stats={depute.stats} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Votes</h2>
        <VoteFilters
          filters={filters}
          onChange={(next) => {
            navigate({
              search: {
                from: next.from,
                to: next.to,
                type: next.type,
                theme: next.theme,
                position: next.position,
              },
              replace: true,
            });
          }}
        />

        {votesLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} lines={2} />
            ))}
          </div>
        )}

        {votesError && (
          <ErrorFallback
            title="Erreur de chargement"
            description="Impossible de charger les votes."
            onRetry={() => refetchVotes()}
          />
        )}

        {!votesLoading && !votesError && votesPages && (
          <>
            {votes.length === 0 ? (
              <EmptyState
                title="Aucun vote"
                description="Aucun vote ne correspond aux filtres sélectionnés."
              />
            ) : (
              <>
                <VoteTimeline votes={votes} />
                {hasNextPage && (
                  <Button
                    variant="outline"
                    className="mt-4 w-full"
                    disabled={isFetchingNextPage}
                    onClick={() => fetchNextPage()}
                  >
                    {isFetchingNextPage
                      ? "Chargement…"
                      : "Charger plus de scrutins"}
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
