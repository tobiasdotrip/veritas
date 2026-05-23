import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { formatDateShort, formatTitle } from "@/lib/utils";
import { BadgeVote } from "@/components/ui/BadgeVote";
import type { DeputeVoteItem } from "@/lib/api-types";

export interface VoteCardProps {
  vote: DeputeVoteItem;
  className?: string;
}

export function VoteCard({ vote, className }: VoteCardProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-primary-bg-subtle",
        className,
      )}
    >
      {/* Indicateur d'alignement */}
      <div
        className="flex shrink-0 items-center"
        title={
          vote.alignment === "aligned"
            ? "Aligné avec le groupe"
            : vote.alignment === "opposed"
              ? "Opposé au groupe"
              : "Neutre"
        }
      >
        <span
          className={cn(
            "block h-3 w-3 rounded-full",
            vote.alignment === "aligned" && "bg-success",
            vote.alignment === "opposed" && "bg-danger",
            vote.alignment === "neutral" && "bg-neutral",
          )}
          aria-hidden="true"
        />
      </div>

      {/* Contenu principal */}
      <div className="min-w-0 flex-1">
        <Link
          to="/scrutin/$id"
          params={{ id: vote.scrutinId }}
          className="text-sm font-semibold text-text-primary hover:text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
          preload="intent"
        >
          {formatTitle(vote.titre)}
        </Link>
        <p className="mt-0.5 text-xs text-text-muted">
          Scrutin n°{vote.numero} · {formatDateShort(vote.dateScrutin)}
          {vote.codeTypeVote ? (
            <span> · {formatTitle(vote.codeTypeVote)}</span>
          ) : (
            ""
          )}
          {vote.parDelegation && (
            <span className="ml-2 text-text-muted/70">Par délégation</span>
          )}
        </p>
      </div>

      {/* Badge de vote à droite */}
      <div className="shrink-0">
        <BadgeVote position={vote.position} />
      </div>
    </div>
  );
}
