import { cn } from "@/lib/utils";

export interface ConcordanceScoreProps {
  score: number;
  votesCommuns: number;
  className?: string;
  size?: number;
}

function scoreColor(score: number): { ring: string; text: string; bg: string } {
  if (score >= 70)
    return {
      ring: "stroke-success",
      text: "text-success",
      bg: "bg-success-bg",
    };
  if (score >= 40)
    return {
      ring: "stroke-warning",
      text: "text-warning",
      bg: "bg-warning-bg",
    };
  return { ring: "stroke-danger", text: "text-danger", bg: "bg-danger-bg" };
}

export function ConcordanceScore({
  score,
  votesCommuns,
  className,
  size = 120,
}: ConcordanceScoreProps) {
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const c = scoreColor(score);

  return (
    <div
      className={cn("flex flex-col items-center gap-2", className)}
      aria-label={`Concordance ${score.toFixed(1)} % sur ${votesCommuns} votes communs`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
      >
        {/* Fond */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          className="stroke-border-light"
          strokeWidth={12}
        />
        {/* Progression */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          className={c.ring}
          strokeWidth={12}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        {/* Score au centre */}
        <text
          x="50%"
          y="50%"
          dy="0.35em"
          textAnchor="middle"
          className={cn("text-2xl font-bold", c.text)}
          fill="currentColor"
        >
          {score.toFixed(0)}%
        </text>
      </svg>
      <p className="text-xs font-medium text-text-secondary">
        {votesCommuns} vote{votesCommuns > 1 ? "s" : ""} commun
        {votesCommuns > 1 ? "s" : ""}
      </p>
    </div>
  );
}
