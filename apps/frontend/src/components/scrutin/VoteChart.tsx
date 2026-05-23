import { cn } from "@/lib/utils";

export interface VoteChartProps {
  pour: number;
  contre: number;
  abstentions: number;
  nonVotants?: number;
  className?: string;
}

const bars = [
  { key: "pour", label: "Pour", color: "#00a95f" },
  { key: "contre", label: "Contre", color: "#e1000f" },
  { key: "abstentions", label: "Abstentions", color: "#c3992a" },
  { key: "nonVotants", label: "Absents", color: "#929292" },
] as const;

export function VoteChart({
  pour,
  contre,
  abstentions,
  nonVotants = 0,
  className,
}: VoteChartProps) {
  const data = [
    { key: "pour" as const, value: pour },
    { key: "contre" as const, value: contre },
    { key: "abstentions" as const, value: abstentions },
    { key: "nonVotants" as const, value: nonVotants },
  ];
  const total = pour + contre + abstentions + nonVotants;

  if (total === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border-light bg-surface p-6 text-center text-sm text-text-muted shadow-sm",
          className,
        )}
      >
        Aucun vote enregistré
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-border-light bg-surface p-6 shadow-sm",
        className,
      )}
      role="img"
      aria-label="Répartition des votes"
    >
      {/* Total */}
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
          Résultat du vote
        </h3>
        <span className="text-2xl font-bold text-text-primary">
          {total}{" "}
          <span className="text-sm font-normal text-text-secondary">
            votants
          </span>
        </span>
      </div>

      {/* Barres */}
      <div className="space-y-3">
        {data.map((d) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          const bar = bars.find((b) => b.key === d.key)!;

          return (
            <div key={d.key} className="flex items-center gap-3">
              {/* Label */}
              <span className="w-24 shrink-0 text-sm font-medium text-text-secondary">
                {bar.label}
              </span>

              {/* Barre */}
              <div className="relative flex-1">
                <div className="h-7 w-full overflow-hidden rounded-md bg-neutral-bg">
                  <div
                    className="h-full rounded-md transition-all duration-slow"
                    style={{
                      width: `${Math.max(pct, 0.5)}%`,
                      backgroundColor: bar.color,
                    }}
                  />
                </div>
                {/* Pourcentage dans la barre si > 10% */}
                {pct >= 10 && (
                  <span className="absolute inset-y-0 left-2 flex items-center text-xs font-semibold text-white drop-shadow">
                    {pct.toFixed(1)}&thinsp;%
                  </span>
                )}
              </div>

              {/* Valeur */}
              <span className="w-12 text-right text-sm font-semibold text-text-primary tabular-nums">
                {d.value}
              </span>

              {/* Pourcentage si barre trop petite */}
              {pct < 10 && pct > 0 && (
                <span className="w-14 text-right text-xs text-text-muted tabular-nums">
                  {pct.toFixed(1)}&thinsp;%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
