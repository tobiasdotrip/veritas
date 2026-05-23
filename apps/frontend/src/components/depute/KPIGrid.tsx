import { cn } from "@/lib/utils";
import { TrendingUp, Vote, Heart, Zap } from "lucide-react";
import type { DeputyStats } from "@veritas/shared";

export interface KPIGridProps {
  stats: DeputyStats | null;
  className?: string;
}

const icons = {
  participation: TrendingUp,
  votes: Vote,
  loyalty: Heart,
  dissidence: Zap,
} as const;

const colorMap: Record<
  keyof typeof icons,
  { bar: string; bg: string; text: string }
> = {
  participation: {
    bar: "bg-primary",
    bg: "bg-primary-bg",
    text: "text-primary",
  },
  votes: { bar: "bg-info", bg: "bg-info-bg", text: "text-info" },
  loyalty: { bar: "bg-success", bg: "bg-success-bg", text: "text-success" },
  dissidence: {
    bar: "bg-warning",
    bg: "bg-warning-bg",
    text: "text-warning",
  },
};

function KPICard({
  label,
  value,
  unit,
  description,
  iconKey,
}: {
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
  iconKey: keyof typeof icons;
}) {
  const Icon = icons[iconKey];
  const c = colorMap[iconKey];
  return (
    <div className="relative overflow-hidden rounded-xl border border-border-light bg-surface p-4 shadow-sm sm:p-5">
      {/* Bande d'accent colorée en haut */}
      <div className={cn("absolute inset-x-0 top-0 h-1", c.bar)} />
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-1">
          <dt className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            {label}
          </dt>
          <dd className="text-2xl font-bold text-text-primary sm:text-3xl">
            {value}
            {unit && (
              <span className="ml-1 text-base font-medium text-text-secondary">
                {unit}
              </span>
            )}
          </dd>
          {description && (
            <p className="text-xs text-text-secondary">{description}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg sm:h-12 sm:w-12",
            c.bg,
          )}
        >
          <Icon
            className={cn("h-5 w-5 sm:h-6 sm:w-6", c.text)}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

export function KPIGrid({ stats, className }: KPIGridProps) {
  if (!stats) {
    return (
      <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl bg-neutral-bg"
          />
        ))}
      </div>
    );
  }

  return (
    <dl className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      <KPICard
        label="Participation"
        value={stats.participationRate.toFixed(1)}
        unit="%"
        description={`${stats.votesCast} votes / ${stats.totalScrutins} scrutins`}
        iconKey="participation"
      />
      <KPICard label="Votes exprimés" value={stats.votesCast} iconKey="votes" />
      <KPICard
        label="Loyauté groupe"
        value={stats.loyaltyRate.toFixed(1)}
        unit="%"
        description="Alignement avec le groupe"
        iconKey="loyalty"
      />
      <KPICard
        label="Dissidences"
        value={stats.votesAgainstGroup}
        description="Votes contre le groupe"
        iconKey="dissidence"
      />
    </dl>
  );
}
