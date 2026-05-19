import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export interface VoteChartProps {
  pour: number;
  contre: number;
  abstentions: number;
  nonVotants?: number;
  className?: string;
}

const colors = {
  pour: "#15803d",
  contre: "#b91c1c",
  abstentions: "#b45309",
  nonVotants: "#6b7280",
};

function Donut({ data, total }: { data: { key: string; value: number }[]; total: number }) {
  const radius = 80;
  const stroke = 24;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  let offset = 0;

  return (
    <svg width={radius * 2 + 20} height={radius * 2 + 20} viewBox={`0 0 ${radius * 2 + 20} ${radius * 2 + 20}`} role="img" aria-label="Répartition des votes">
      <g transform={`translate(${radius + 10},${radius + 10})`}>
        {data.map((d) => {
          if (d.value <= 0) return null;
          const pct = d.value / total;
          const dash = pct * circumference;
          const circle = (
            <circle
              key={d.key}
              r={normalizedRadius}
              fill="transparent"
              stroke={colors[d.key as keyof typeof colors]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return circle;
        })}
        <text textAnchor="middle" dy="0.35em" className="text-2xl font-bold" fill="#111827">
          {total}
        </text>
      </g>
    </svg>
  );
}

function HorizontalBars({ data, total }: { data: { key: string; value: number }[]; total: number }) {
  return (
    <div className="flex flex-col gap-2" role="img" aria-label="Répartition des votes">
      {data.map((d) => {
        if (d.value <= 0) return null;
        const pct = total > 0 ? (d.value / total) * 100 : 0;
        return (
          <div key={d.key} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs font-medium text-text-secondary capitalize">{d.key}</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-neutral-bg">
              <div
                className="h-full rounded-full transition-all duration-slow"
                style={{ width: `${pct}%`, backgroundColor: colors[d.key as keyof typeof colors] }}
              />
            </div>
            <span className="w-10 text-right text-xs font-medium text-text-primary">{d.value}</span>
          </div>
        );
      })}
    </div>
  );
}

export function VoteChart({ pour, contre, abstentions, nonVotants = 0, className }: VoteChartProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const data = [
    { key: "pour", value: pour },
    { key: "contre", value: contre },
    { key: "abstentions", value: abstentions },
    { key: "nonVotants", value: nonVotants },
  ];
  const total = pour + contre + abstentions + nonVotants;

  return (
    <div className={cn("flex items-center justify-center rounded-lg border border-border bg-surface p-4", className)}>
      {isDesktop ? <Donut data={data} total={total} /> : <HorizontalBars data={data} total={total} />}
    </div>
  );
}
