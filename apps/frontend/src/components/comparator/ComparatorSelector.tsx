import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { useSearch } from "@/hooks/useSearch";
import { useComparatorStore } from "@/stores/comparator-store";
import { X, UserPlus, Search } from "lucide-react";

export interface ComparatorSelectorProps {
  className?: string;
}

export function ComparatorSelector({ className }: ComparatorSelectorProps) {
  const [query, setQuery] = React.useState("");
  const reference = useComparatorStore((s) => s.reference);
  const compared = useComparatorStore((s) => s.compared);
  const addCompared = useComparatorStore((s) => s.addCompared);
  const removeCompared = useComparatorStore((s) => s.removeCompared);
  const setReference = useComparatorStore((s) => s.setReference);

  const { data, isLoading } = useSearch(query, "depute", 0, 10);

  const canAdd =
    compared.length + (reference ? 1 : 0) < 5;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {reference && (
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm text-primary">
            <span className="font-medium">Réf. : {reference.firstName} {reference.lastName}</span>
            <button
              type="button"
              onClick={() => setReference(reference)}
              className="rounded-full p-0.5 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="Retirer la référence"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {compared.map((d) => (
          <div
            key={d.slug}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
          >
            <span>
              {d.firstName} {d.lastName}
            </span>
            <button
              type="button"
              onClick={() => removeCompared(d.slug)}
              className="rounded-full p-0.5 hover:bg-neutral-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label={`Retirer ${d.firstName} ${d.lastName}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {canAdd && (
        <div className="relative">
          <Input
            placeholder="Ajouter un député…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            iconLeft={<Search className="h-4 w-4" />}
            clearable
          />
          {query.length >= 2 && data && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-surface shadow-md">
              <ul role="listbox" className="max-h-64 overflow-auto py-1">
                {data.deputies.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-text-muted">Aucun résultat</li>
                ) : (
                  data.deputies.map((d) => {
                    const already =
                      reference?.slug === d.slug || compared.some((x) => x.slug === d.slug);
                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          disabled={already}
                          onClick={() => {
                            const summary = {
                              id: d.id,
                              firstName: d.firstName,
                              lastName: d.lastName,
                              slug: d.slug,
                              photoUrl: d.photoUrl,
                              groupAbbreviation: d.groupAbbreviation,
                            };
                            if (!reference) {
                              setReference(summary);
                            } else {
                              addCompared(summary);
                            }
                            setQuery("");
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
                            already
                              ? "cursor-not-allowed opacity-50"
                              : "hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-none"
                          )}
                        >
                          {d.photoUrl ? (
                            <img
                              src={d.photoUrl}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                              aria-hidden="true"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-bg text-xs font-bold text-text-muted">
                              {d.firstName.charAt(0)}
                              {d.lastName.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-text-primary">
                              {d.firstName} {d.lastName}
                            </p>
                            <p className="text-xs text-text-muted">
                              {d.groupAbbreviation ?? "Groupe inconnu"}
                              {d.circoLabel ? ` · ${d.circoLabel}` : ""}
                            </p>
                          </div>
                          {!already && <UserPlus className="h-4 w-4 text-text-muted" />}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}
          {isLoading && query.length >= 2 && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-surface p-3 text-sm text-text-muted shadow-md">
              Chargement…
            </div>
          )}
        </div>
      )}

      {!canAdd && (
        <p className="text-xs text-text-muted">
          Limite de 5 députés atteinte.
        </p>
      )}
    </div>
  );
}
