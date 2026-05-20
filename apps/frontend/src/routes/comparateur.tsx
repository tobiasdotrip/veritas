import { createFileRoute } from "@tanstack/react-router";
import { useComparison } from "@/hooks/useComparison";
import { ComparatorSelector } from "@/components/comparator/ComparatorSelector";
import { ConcordanceScore } from "@/components/comparator/ConcordanceScore";
import { ComparisonTable } from "@/components/comparator/ComparisonTable";
import { useComparatorStore } from "@/stores/comparator-store";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { Button } from "@/components/ui/Button";
import { ShareButton } from "@/components/ui/ShareButton";
import { Scale } from "lucide-react";

export const Route = createFileRoute("/comparateur")({
  component: ComparatorPage,
});

function ComparatorPage() {
  const reference = useComparatorStore((s) => s.reference);
  const compared = useComparatorStore((s) => s.compared);
  const period = useComparatorStore((s) => s.period);
  const clear = useComparatorStore((s) => s.clear);

  const compareSlugs = compared.map((d) => d.slug);
  const {
    data: result,
    isLoading,
    error,
    refetch,
  } = useComparison(reference?.slug ?? "", compareSlugs, period);

  const currentUrl =
    typeof window !== "undefined" ? window.location.href : "";

  if (!reference) {
    return (
      <div className="space-y-6 py-8">
        <h1 className="text-2xl font-bold text-text-primary">
          Comparateur de votes
        </h1>
        <ComparatorSelector />
        <EmptyState
          title="Aucun député sélectionné"
          description="Sélectionnez un député de référence pour commencer la comparaison."
          icon={<Scale className="h-10 w-10 text-text-muted" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-primary">
          Comparateur de votes
        </h1>
        <div className="flex items-center gap-2">
          <ShareButton url={currentUrl} />
          <Button variant="ghost" size="sm" onClick={clear}>
            Réinitialiser
          </Button>
        </div>
      </div>

      <ComparatorSelector />

      {isLoading && (
        <div className="space-y-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </div>
      )}

      {error && (
        <ErrorFallback
          title="Erreur de comparaison"
          description="Impossible de calculer la concordance."
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !error && result && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-around gap-6 rounded-lg border border-border bg-surface p-6">
            <ConcordanceScore
              score={result.concordanceRate}
              votesCommuns={result.totalCommonVotes}
            />
            {result.pairwise.map((pair) => (
              <div key={`${pair.deputyAId}-${pair.deputyBId}`} className="text-center">
                <p className="mb-2 text-xs text-text-muted">
                  {pair.deputyAName} / {pair.deputyBName}
                </p>
                <ConcordanceScore
                  score={pair.concordanceRate}
                  votesCommuns={pair.totalCommon}
                />
              </div>
            ))}
          </div>

          {result.totalCommonVotes === 0 ? (
            <EmptyState
              title="Aucun vote commun"
              description="Ces députés n'ont pas participé aux mêmes scrutins sur la période sélectionnée."
            />
          ) : result.divergences.length > 0 ? (
            <ComparisonTable result={result} />
          ) : (
            <EmptyState
              title="Concordance totale"
              description="Sur les votes communs, tous les députés ont voté de la même manière."
            />
          )}
        </div>
      )}
    </div>
  );
}
