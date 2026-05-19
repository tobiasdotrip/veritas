import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils";
import { BadgeVote } from "@/components/ui/BadgeVote";
import { Card } from "@/components/ui/Card";
import type { DeputeVoteItem } from "@/lib/api-types";

export interface VoteCardProps {
  vote: DeputeVoteItem;
  className?: string;
}

export function VoteCard({ vote, className }: VoteCardProps) {
  return (
    <Card
      variant="hoverable"
      className={cn("flex flex-col gap-2", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to="/scrutin/$id"
            params={{ id: vote.scrutinId }}
            className="text-sm font-semibold text-text-primary hover:text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
            preload="intent"
          >
            Scrutin n°{vote.numero} — {vote.titre}
          </Link>
          <p className="mt-0.5 text-xs text-text-muted">
            {formatDateShort(vote.dateScrutin)}
            {vote.codeTypeVote ? ` · ${vote.codeTypeVote}` : ""}
          </p>
        </div>
        <BadgeVote position={vote.position} />
      </div>
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full",
            vote.alignment === "aligned" && "bg-success",
            vote.alignment === "opposed" && "bg-danger",
            vote.alignment === "neutral" && "bg-neutral"
          )}
          aria-hidden="true"
        />
        <span>
          {vote.alignment === "aligned"
            ? "Aligné avec le groupe"
            : vote.alignment === "opposed"
            ? "Opposé au groupe"
            : "Neutre"}
        </span>
        {vote.parDelegation && (
          <span className="ml-auto text-text-muted">Par délégation</span>
        )}
      </div>
    </Card>
  );
}
