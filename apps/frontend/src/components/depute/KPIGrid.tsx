import { cn } from "@/lib/utils";
import type { DeputyStats } from "@veritas/shared";

export interface KPIGridProps {
  stats: DeputyStats | null;
  className?: string;
}

function KPICard({
  label,
  value,
  unit,
  description,
}: {
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3 sm:p-4">
      <dt className="text-xs font-medium text-text-muted uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-2xl font-bold text-text-primary">
        {value}
        {unit && (
          <span className="ml-1 text-sm font-medium text-text-secondary">
            {unit}
          </span>
        )}
      </dd>
      {description && (
        <p className="text-xs text-text-secondary">{description}</p>
      )}
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
            className="h-24 animate-pulse rounded-lg bg-neutral-bg"
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
        description={`${stats.votesCast} votes sur ${stats.totalScrutins} scrutins`}
      />
      <KPICard label="Votes" value={stats.votesCast} />
      <KPICard
        label="Loyauté"
        value={stats.loyaltyRate.toFixed(1)}
        unit="%"
        description="Alignement avec le groupe"
      />
      <KPICard
        label="Dissidence"
        value={stats.votesAgainstGroup}
        description="Votes contre la ligne du groupe"
      />
    </dl>
  );
}
