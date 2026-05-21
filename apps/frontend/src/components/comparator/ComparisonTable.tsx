import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils";
import { BadgeVote } from "@/components/ui/BadgeVote";
import type { ComparisonResult } from "@/lib/api-types";

export interface ComparisonTableProps {
  result: ComparisonResult;
  className?: string;
}

export function ComparisonTable({ result, className }: ComparisonTableProps) {
  const slugs = result.deputies.map((d) => d.slug);
  const names = result.deputies.map((d) => `${d.firstName} ${d.lastName}`);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">
          Scrutins où les députés n'ont pas voté de la même manière
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-surface px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wide"
            >
              Scrutin
            </th>
            {names.map((n, i) => (
              <th
                key={slugs[i]}
                scope="col"
                className="px-3 py-2 text-center text-xs font-medium text-text-muted uppercase tracking-wide"
              >
                {n}
              </th>
            ))}
            <th
              scope="col"
              className="px-3 py-2 text-center text-xs font-medium text-text-muted uppercase tracking-wide"
            >
              Résultat
            </th>
          </tr>
        </thead>
        <tbody>
          {result.divergences.map((row) => {
            const positionsBySlug = Object.fromEntries(
              row.positions.map((p) => [p.slug, p.position]),
            );
            return (
              <tr
                key={row.scrutinId}
                className="border-b border-border hover:bg-surface-raised"
              >
                <td className="sticky left-0 z-10 bg-surface px-3 py-3 hover:bg-surface-raised">
                  <p className="font-medium text-text-primary">{row.titre}</p>
                  <p className="text-xs text-text-muted">
                    {formatDateShort(row.dateScrutin)}
                  </p>
                </td>
                {slugs.map((slug) => {
                  const pos = positionsBySlug[slug];
                  return (
                    <td key={slug} className="px-3 py-3 text-center">
                      {pos ? (
                        <BadgeVote position={pos} />
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-center">
                  {row.sortCode ? (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        row.sortCode === "adopté"
                          ? "bg-success-bg text-success"
                          : "bg-danger-bg text-danger",
                      )}
                    >
                      {row.sortCode === "adopté" ? "Adopté" : "Rejeté"}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
