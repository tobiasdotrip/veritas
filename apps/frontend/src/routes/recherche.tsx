import * as React from "react";
import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { BadgeResultat } from "@/components/ui/BadgeResultat";
import { SearchCombobox } from "@/components/ui/SearchCombobox";
import { useSearch as useSearchData } from "@/hooks/useSearch";
import { formatDateShort } from "@/lib/utils";
import { Search } from "lucide-react";

function validateSearch(search: Record<string, unknown>) {
  return {
    q: typeof search.q === "string" ? search.q : undefined,
    type: ["depute", "scrutin", "all"].includes(search.type as string)
      ? (search.type as "depute" | "scrutin" | "all")
      : "all",
    theme: typeof search.theme === "string" ? search.theme : undefined,
  };
}

export const Route = createFileRoute("/recherche")({
  component: SearchPage,
  validateSearch,
});

function SearchPage() {
  const search = useSearch({ from: "/recherche" });
  const navigate = useNavigate({ from: "/recherche" });
  const [input, setInput] = React.useState(search.q ?? "");

  const { data, isLoading, error, refetch } = useSearchData(
    search.q ?? "",
    search.type ?? "all",
    0,
    20
  );

  const options = React.useMemo(() => {
    const list: { id: string; label: string; group: string; meta: string }[] = [];
    data?.deputies.forEach((d) =>
      list.push({
        id: d.slug,
        label: `${d.firstName} ${d.lastName}`,
        group: "Députés",
        meta: d.circoLabel ?? d.departmentId ?? "",
      })
    );
    data?.scrutins.forEach((s) =>
      list.push({
        id: s.id,
        label: s.titre,
        group: "Scrutins",
        meta: `Scrutin n°${s.numero}`,
      })
    );
    return list;
  }, [data]);

  const applySearch = (value: string) => {
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, q: value || undefined }) });
  };

  const setType = (type: "depute" | "scrutin" | "all") => {
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, type }) });
  };

  return (
    <div className="space-y-6 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary">Recherche</h1>
        <SearchCombobox
          value={input}
          onChange={(v) => {
            setInput(v);
            applySearch(v);
          }}
          onSelect={(opt) => {
            setInput(opt.label);
            applySearch(opt.label);
          }}
          options={options}
          isLoading={isLoading}
          emptyMessage="Aucun résultat"
          inputClassName="h-12"
        />
      </div>

      <div className="flex gap-2">
        {(["all", "depute", "scrutin"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30 ${
              search.type === t || (!search.type && t === "all")
                ? "bg-primary text-white"
                : "bg-surface-raised text-text-secondary border border-border hover:bg-neutral-bg"
            }`}
          >
            {t === "all" ? "Tout" : t === "depute" ? "Députés" : "Scrutins"}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {error && (
        <EmptyState
          title="Erreur de chargement"
          description="Impossible de récupérer les résultats."
          action={
            <button
              type="button"
              onClick={() => refetch()}
              className="text-sm font-medium text-primary underline"
            >
              Réessayer
            </button>
          }
        />
      )}

      {!isLoading && !error && data && (
        <div className="space-y-6">
          {(search.type === "all" || search.type === "depute") &&
            data.deputies.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-text-primary">
                  Députés
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.deputies.map((d) => (
                    <Card key={d.id} variant="hoverable">
                      <a
                        href={`/depute/${d.slug}`}
                        className="flex items-center gap-3 focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate({ to: "/depute/$slug", params: { slug: d.slug } });
                        }}
                      >
                        {d.photoUrl ? (
                          <img
                            src={d.photoUrl}
                            alt=""
                            className="h-12 w-12 rounded-full object-cover"
                            aria-hidden="true"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-bg text-xs font-bold text-text-muted">
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
                      </a>
                    </Card>
                  ))}
                </div>
              </section>
            )}

          {(search.type === "all" || search.type === "scrutin") &&
            data.scrutins.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-text-primary">
                  Scrutins
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.scrutins.map((s) => (
                    <Card key={s.id} variant="hoverable">
                      <a
                        href={`/scrutin/${s.id}`}
                        className="flex flex-col gap-1 focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate({ to: "/scrutin/$id", params: { id: s.id } });
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-text-primary line-clamp-2">
                            Scrutin n°{s.numero}
                          </p>
                          <BadgeResultat resultat={s.sortCode} />
                        </div>
                        <p className="text-xs text-text-muted">
                          {formatDateShort(s.dateScrutin)}
                        </p>
                        <p className="text-sm text-text-secondary line-clamp-2">
                          {s.titre}
                        </p>
                      </a>
                    </Card>
                  ))}
                </div>
              </section>
            )}

          {data.deputies.length === 0 && data.scrutins.length === 0 && (
            <EmptyState
              title="Aucun résultat"
              description="Essayez avec d'autres termes de recherche."
              icon={<Search className="h-10 w-10 text-text-muted" />}
            />
          )}
        </div>
      )}
    </div>
  );
}
