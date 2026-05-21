import { cn } from "@/lib/utils";

export interface ConcordanceScoreProps {
  score: number;
  votesCommuns: number;
  className?: string;
  size?: number;
}

export function ConcordanceScore({
  score,
  votesCommuns,
  className,
  size = 120,
}: ConcordanceScoreProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#15803d" : score >= 40 ? "#b45309" : "#b91c1c";

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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#e5e7eb"
          strokeWidth={10}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text
          x="50%"
          y="50%"
          dy="0.35em"
          textAnchor="middle"
          className="text-2xl font-bold"
          fill="#111827"
        >
          {score.toFixed(0)}%
        </text>
      </svg>
      <p className="text-sm text-text-secondary">
        {votesCommuns} votes communs
      </p>
    </div>
  );
}
