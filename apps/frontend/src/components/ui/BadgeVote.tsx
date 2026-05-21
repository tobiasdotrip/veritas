import * as React from "react";
import { cn } from "@/lib/utils";
import { ThumbsUp, ThumbsDown, Minus, CircleOff } from "lucide-react";
import type { VotePosition } from "@veritas/shared";

const config: Record<
  VotePosition | "absent",
  { label: string; icon: React.ReactNode; classes: string }
> = {
  pour: {
    label: "Pour",
    icon: <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />,
    classes: "bg-success-bg text-success",
  },
  contre: {
    label: "Contre",
    icon: <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />,
    classes: "bg-danger-bg text-danger",
  },
  abstention: {
    label: "Abstention",
    icon: <Minus className="h-3.5 w-3.5" aria-hidden="true" />,
    classes: "bg-warning-bg text-warning",
  },
  nonVotant: {
    label: "Absent",
    icon: <CircleOff className="h-3.5 w-3.5" aria-hidden="true" />,
    classes: "bg-neutral-bg text-neutral",
  },
  absent: {
    label: "Absent",
    icon: <CircleOff className="h-3.5 w-3.5" aria-hidden="true" />,
    classes: "bg-neutral-bg text-neutral",
  },
};

export interface BadgeVoteProps {
  position: VotePosition | "absent";
  showLabel?: boolean;
  className?: string;
}

export function BadgeVote({
  position,
  showLabel = true,
  className,
}: BadgeVoteProps) {
  const c = config[position] ?? config.nonVotant;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        c.classes,
        className,
      )}
      aria-label={`Vote : ${c.label}`}
      title={`Vote : ${c.label}`}
    >
      {c.icon}
      {showLabel && <span>{c.label}</span>}
    </span>
  );
}
