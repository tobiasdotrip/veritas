import { cn } from "@/lib/utils";
import { formatDateShort, formatTitle } from "@/lib/utils";
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
    <div
      className={cn(
        "overflow-x-auto overflow-y-clip rounded-xl border border-border-light bg-surface shadow-sm",
        className,
      )}
    >
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">
          Scrutins où les députés n'ont pas voté de la même manière
        </caption>
        <thead>
          <tr className="border-b-2 border-border-light">
            <th
              scope="col"
              className="bg-surface px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted"
            >
              Scrutin
            </th>
            {names.map((n, i) => (
              <th
                key={slugs[i]}
                scope="col"
                className="bg-surface px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted"
              >
                {n}
              </th>
            ))}
            <th
              scope="col"
              className="bg-surface px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted"
            >
              Résultat
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {result.divergences.map((row) => {
            const positionsBySlug = Object.fromEntries(
              row.positions.map((p) => [p.slug, p.position]),
            );
            return (
              <tr
                key={row.scrutinId}
                className="transition-colors hover:bg-primary-bg-subtle"
              >
                <td className="bg-surface px-4 py-3 hover:bg-primary-bg-subtle">
                  <p className="font-semibold text-text-primary">
                    {formatTitle(row.titre)}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Scrutin n°{row.numero} · {formatDateShort(row.dateScrutin)}
                  </p>
                </td>
                {slugs.map((slug) => {
                  const pos = positionsBySlug[slug];
                  return (
                    <td key={slug} className="px-4 py-3 text-center">
                      {pos ? (
                        <BadgeVote position={pos} />
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-center">
                  {row.sortCode ? (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
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
