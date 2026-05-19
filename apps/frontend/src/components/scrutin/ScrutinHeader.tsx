import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { BadgeResultat } from "@/components/ui/BadgeResultat";
import type { ScrutinDetail } from "@/lib/api-types";

export interface ScrutinHeaderProps {
  scrutin: ScrutinDetail;
  className?: string;
}

export function ScrutinHeader({ scrutin, className }: ScrutinHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {scrutin.themes.map((t) => (
          <span
            key={t.slug}
            className="inline-flex items-center rounded-full bg-surface-raised px-2.5 py-0.5 text-xs font-medium text-text-secondary border border-border"
          >
            {t.label}
          </span>
        ))}
        <BadgeResultat resultat={scrutin.sortCode} size="md" />
      </div>
      <h1 className="text-xl font-bold leading-snug text-text-primary sm:text-2xl">
        Scrutin n°{scrutin.numero} — {scrutin.titre}
      </h1>
      <p className="text-sm text-text-secondary">
        {formatDate(scrutin.dateScrutin)}
        {scrutin.libelleTypeVote ? ` · ${scrutin.libelleTypeVote}` : ""}
      </p>
    </div>
  );
}
