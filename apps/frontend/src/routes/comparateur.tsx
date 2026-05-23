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

  // Page sans référence : onboarding
  if (!reference) {
    return (
      <div className="space-y-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            Comparateur de votes
          </h1>
        </div>
        <ComparatorSelector />
        <EmptyState
          title="Aucun député sélectionné"
          description="Sélectionnez un député de référence pour commencer la comparaison."
          icon={<Scale className="h-12 w-12 text-text-muted" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-8">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
          Comparateur de votes
        </h1>
        <div className="flex items-center gap-2">
          <ShareButton
            url={typeof window !== "undefined" ? window.location.href : ""}
          />
          <Button variant="outline" size="sm" onClick={clear}>
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Sélecteur */}
      <ComparatorSelector />

      {/* Chargement */}
      {isLoading && (
        <div className="space-y-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </div>
      )}

      {/* Erreur */}
      {error && (
        <ErrorFallback
          title="Erreur de comparaison"
          description="Impossible de calculer la concordance."
          onRetry={() => refetch()}
        />
      )}

      {/* Résultats */}
      {!isLoading && !error && result && (
        <div className="space-y-6">
          {/* Scores de concordance */}
          <div className="rounded-xl border border-border-light bg-surface p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
              Taux de concordance
            </h2>
            <div className="flex flex-wrap items-center justify-around gap-6">
              {/* Score global */}
              {compared.length > 0 && (
                <div className="text-center">
                  <p className="mb-3 text-xs font-medium text-text-muted">
                    Concordance globale
                  </p>
                  <ConcordanceScore
                    score={result.concordanceRate}
                    votesCommuns={result.totalCommonVotes}
                    size={130}
                  />
                </div>
              )}

              {/* Scores par paire */}
              {result.pairwise.map((pair) => (
                <div
                  key={`${pair.deputyAId}-${pair.deputyBId}`}
                  className="text-center"
                >
                  <p className="mb-3 text-xs font-medium text-text-muted">
                    {pair.deputyAName.split(" ")[0]} /{" "}
                    {pair.deputyBName.split(" ")[0]}
                  </p>
                  <ConcordanceScore
                    score={pair.concordanceRate}
                    votesCommuns={pair.totalCommon}
                    size={100}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Tableau ou message */}
          {result.totalCommonVotes === 0 ? (
            <EmptyState
              title="Aucun vote commun"
              description="Ces députés n'ont pas participé aux mêmes scrutins sur la période sélectionnée."
            />
          ) : result.divergences.length > 0 ? (
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
                Divergences ({result.divergences.length})
              </h2>
              <ComparisonTable result={result} />
            </div>
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
