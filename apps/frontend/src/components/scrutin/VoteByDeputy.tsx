import * as React from "react";
import { useScrutinVotes } from "@/hooks/useScrutinVotes";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { cn, getDeputyPhotoUrl } from "@/lib/utils";
import { ThumbsUp, ThumbsDown, Minus, CircleOff } from "lucide-react";

interface VoteByDeputyProps {
  scrutinId: string;
}

const POSITIONS = [
  {
    key: "pour" as const,
    label: "Pour",
    icon: ThumbsUp,
    color: "text-success",
    border: "border-success/20",
    avatarBg: "bg-success-bg",
    avatarText: "text-success",
  },
  {
    key: "contre" as const,
    label: "Contre",
    icon: ThumbsDown,
    color: "text-danger",
    border: "border-danger/20",
    avatarBg: "bg-danger-bg",
    avatarText: "text-danger",
  },
  {
    key: "abstention" as const,
    label: "Abstention",
    icon: Minus,
    color: "text-warning",
    border: "border-warning/20",
    avatarBg: "bg-warning-bg",
    avatarText: "text-warning",
  },
  {
    key: "nonVotant" as const,
    label: "Absents",
    icon: CircleOff,
    color: "text-neutral",
    border: "border-neutral/20",
    avatarBg: "bg-neutral-bg",
    avatarText: "text-neutral",
  },
] as const;

const DeputyCard = React.memo(function DeputyCard({
  deputyId,
  firstName,
  lastName,
  groupAbbreviation,
  parDelegation,
  avatarBg,
  avatarText,
}: {
  deputyId: string;
  firstName: string;
  lastName: string;
  groupAbbreviation: string | null;
  parDelegation: boolean | null;
  avatarBg: string;
  avatarText: string;
}) {
  const [showPhoto, setShowPhoto] = React.useState(false);
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;
  const photoUrl = getDeputyPhotoUrl(deputyId);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-light bg-surface px-3 py-2.5 shadow-sm transition-colors hover:bg-surface-raised">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
        <img
          src={photoUrl}
          alt=""
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity",
            showPhoto ? "opacity-100" : "opacity-0",
          )}
          loading="lazy"
          onLoad={() => setShowPhoto(true)}
          onError={() => setShowPhoto(false)}
        />
        <div
          className={cn(
            "flex h-full w-full items-center justify-center text-sm font-bold",
            avatarBg,
            avatarText,
          )}
        >
          {initials}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">
          {firstName} {lastName}
        </p>
        <div className="flex items-center gap-2">
          {groupAbbreviation && (
            <span className="text-xs text-text-muted">{groupAbbreviation}</span>
          )}
          {parDelegation && (
            <span className="text-xs text-text-muted/60">Délégation</span>
          )}
        </div>
      </div>
    </div>
  );
});

export function VoteByDeputy({ scrutinId }: VoteByDeputyProps) {
  const { data: votes, isLoading, error, refetch } = useScrutinVotes(scrutinId);

  const votesByPosition = React.useMemo(() => {
    if (!votes) return { pour: [], contre: [], abstention: [], nonVotant: [] };
    const map: Record<string, typeof votes> = {
      pour: [],
      contre: [],
      abstention: [],
      nonVotant: [],
    };
    for (const v of votes) {
      map[v.position]?.push(v);
    }
    return map;
  }, [votes]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorFallback
        title="Erreur de chargement"
        description="Impossible de charger les votes individuels."
        onRetry={() => refetch()}
      />
    );
  }

  if (!votes || votes.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-text-muted">
        Aucun vote individuel disponible pour ce scrutin.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {POSITIONS.map((pos) => {
        const list = votesByPosition[pos.key] ?? [];
        const Icon = pos.icon;
        return (
          <div
            key={pos.key}
            className={cn(
              "flex flex-col gap-2 rounded-xl border bg-surface p-4 shadow-sm",
              pos.border,
            )}
          >
            <div className={cn("mb-1 flex items-center gap-2", pos.color)}>
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-bold">{pos.label}</span>
              <span className="ml-auto text-xs font-medium opacity-60">
                {list.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {list.length === 0 ? (
                <span className="py-4 text-center text-xs text-text-muted">
                  Aucun
                </span>
              ) : (
                list.map((v) => (
                  <DeputyCard
                    key={v.voteId}
                    deputyId={v.deputyId}
                    firstName={v.deputyFirstName}
                    lastName={v.deputyLastName}
                    groupAbbreviation={v.groupAbbreviation}
                    parDelegation={v.parDelegation}
                    avatarBg={pos.avatarBg}
                    avatarText={pos.avatarText}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
