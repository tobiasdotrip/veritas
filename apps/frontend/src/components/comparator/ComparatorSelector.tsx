import * as React from "react";
import { cn, getDeputyPhotoUrl } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { useSearch } from "@/hooks/useSearch";
import { useComparatorStore } from "@/stores/comparator-store";
import { X, UserPlus, Search, Users } from "lucide-react";

export interface ComparatorSelectorProps {
  className?: string;
}

export function ComparatorSelector({ className }: ComparatorSelectorProps) {
  const [query, setQuery] = React.useState("");
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLDivElement>(null);
  const reference = useComparatorStore((s) => s.reference);
  const compared = useComparatorStore((s) => s.compared);
  const addCompared = useComparatorStore((s) => s.addCompared);
  const removeCompared = useComparatorStore((s) => s.removeCompared);
  const setReference = useComparatorStore((s) => s.setReference);
  const clearReference = useComparatorStore((s) => s.clearReference);

  const { data, isLoading } = useSearch(query, undefined, 10);

  const canAdd = compared.length + (reference ? 1 : 0) < 5;

  // Fermer le dropdown au clic extérieur
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Députés sélectionnés */}
      {(reference || compared.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {reference && (
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-primary-bg px-3 py-1.5 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                R
              </span>
              <span className="font-semibold text-primary">
                {reference.firstName} {reference.lastName}
              </span>
              <button
                type="button"
                onClick={() => clearReference()}
                className="ml-0.5 rounded-full p-0.5 text-primary/60 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                aria-label="Retirer la référence"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {compared.map((d, i) => (
            <div
              key={d.slug}
              className="inline-flex items-center gap-2 rounded-full border border-border-light bg-surface px-3 py-1.5 text-sm shadow-sm"
            >
              <span className="text-xs font-semibold text-text-muted">
                {i + 1}
              </span>
              <span className="font-medium text-text-primary">
                {d.firstName} {d.lastName}
              </span>
              <button
                type="button"
                onClick={() => removeCompared(d.slug)}
                className="rounded-full p-0.5 text-text-muted hover:bg-neutral-bg hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                aria-label={`Retirer ${d.firstName} ${d.lastName}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Barre de recherche */}
      {canAdd && (
        <div ref={inputRef} className="relative">
          <Input
            placeholder={
              !reference
                ? "Sélectionner un député de référence…"
                : "Ajouter un député à comparer…"
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => {
              if (query.length >= 2) setDropdownOpen(true);
            }}
            iconLeft={<Search className="h-4 w-4" />}
            clearable
          />
          {dropdownOpen && query.length >= 2 && data && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-border-light bg-surface shadow-lg">
              <ul role="listbox" className="max-h-72 overflow-auto py-1">
                {data.deputies.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-text-muted">
                    Aucun député trouvé
                  </li>
                ) : (
                  data.deputies.map((d) => {
                    const already =
                      reference?.slug === d.slug ||
                      compared.some((x) => x.slug === d.slug);
                    const itemPhotoUrl = d.photoUrl ?? getDeputyPhotoUrl(d.id);
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
                              photoUrl: itemPhotoUrl,
                              groupAbbreviation: d.groupAbbreviation,
                            };
                            if (!reference) {
                              setReference(summary);
                            } else {
                              addCompared(summary);
                            }
                            setQuery("");
                            setDropdownOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                            already
                              ? "cursor-not-allowed opacity-40"
                              : "hover:bg-primary-bg-subtle focus-visible:bg-primary-bg-subtle focus-visible:outline-none",
                          )}
                        >
                          {itemPhotoUrl ? (
                            <img
                              src={itemPhotoUrl}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover"
                              aria-hidden="true"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-bg text-xs font-bold text-primary">
                              {d.firstName.charAt(0)}
                              {d.lastName.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-text-primary">
                              {d.firstName} {d.lastName}
                            </p>
                            <p className="text-xs text-text-muted">
                              {d.groupAbbreviation ?? "Groupe inconnu"}
                              {d.circoLabel ? ` · ${d.circoLabel}` : ""}
                            </p>
                          </div>
                          {already ? (
                            <span className="text-xs text-text-muted">
                              Déjà présent
                            </span>
                          ) : (
                            <UserPlus className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}
          {isLoading && query.length >= 2 && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-border-light bg-surface p-4 text-sm text-text-muted shadow-lg text-center">
              Recherche en cours…
            </div>
          )}
        </div>
      )}

      {!canAdd && (
        <p className="rounded-lg bg-warning-bg px-4 py-2 text-sm font-medium text-warning">
          Limite de 5 députés atteinte.
        </p>
      )}

      {!reference && compared.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Users className="h-12 w-12 text-text-muted" aria-hidden="true" />
          <div>
            <p className="font-medium text-text-primary">
              Comparez les votes de vos députés
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Sélectionnez un député de référence, puis ajoutez jusqu'à 4 autres
              députés pour voir leurs divergences.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
