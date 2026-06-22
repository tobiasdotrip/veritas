import * as React from "react";
import {
  createFileRoute,
  useSearch,
  useNavigate,
} from "@tanstack/react-router";
import { Card } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { BadgeResultat } from "@/components/ui/BadgeResultat";
import { SearchCombobox } from "@/components/ui/SearchCombobox";
import { useSearch as useSearchData } from "@/hooks/useSearch";
import { useThemeScrutins } from "@/hooks/useThemeScrutins";
import { formatDateShort, getDeputyPhotoUrl } from "@/lib/utils";
import { Search } from "lucide-react";
import {
  defaultDeputeSearch,
  defaultRechercheSearch,
  type RechercheSearch,
} from "@/lib/route-search";
import { ThemeSlugOptional } from "@veritas/shared/schemas";

function validateSearch(search: Record<string, unknown>): RechercheSearch {
  const theme =
    typeof search.theme === "string"
      ? ThemeSlugOptional.safeParse(search.theme).success
        ? search.theme
        : undefined
      : undefined;

  return {
    q: typeof search.q === "string" ? search.q : undefined,
    type: ["depute", "scrutin", "all"].includes(search.type as string)
      ? (search.type as "depute" | "scrutin" | "all")
      : defaultRechercheSearch.type,
    theme,
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

  React.useEffect(() => {
    setInput(search.q ?? "");
  }, [search.q]);

  React.useEffect(() => {
    const trimmed = input.trim();
    if (trimmed === (search.q ?? "")) return;

    const timer = window.setTimeout(() => {
      navigate({
        search: (prev) => ({ ...prev, q: trimmed || undefined }),
        replace: true,
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [input, search.q, navigate]);

  const query = search.q ?? "";
  const {
    data: rawData,
    isLoading: isSearchLoading,
    error,
    refetch,
  } = useSearchData(query, 0, 20);
  const {
    data: themeScrutins,
    isLoading: isThemeLoading,
    error: themeError,
  } = useThemeScrutins(search.theme, 20);

  const isLoading = isSearchLoading || (!!search.theme && isThemeLoading);
  const loadError = error ?? themeError;
  const hasSearch = query.length >= 2 || !!search.theme;

  const data = React.useMemo(() => {
    const type = search.type ?? "all";
    const searchDeputies =
      query.length >= 2 && type !== "scrutin" ? (rawData?.deputies ?? []) : [];
    const searchScrutins =
      query.length >= 2 && type !== "depute" ? (rawData?.scrutins ?? []) : [];
    const themedScrutins =
      search.theme && type !== "depute" ? (themeScrutins ?? []) : [];

    const scrutinIds = new Set(searchScrutins.map((s) => s.id));
    const mergedScrutins = [
      ...searchScrutins,
      ...themedScrutins.filter((s) => !scrutinIds.has(s.id)),
    ];

    return {
      deputies: searchDeputies,
      scrutins: mergedScrutins,
    };
  }, [rawData, search.type, search.theme, themeScrutins, query]);

  const options = React.useMemo(() => {
    const list: { id: string; label: string; group: string; meta: string }[] =
      [];
    data?.deputies.forEach((d) =>
      list.push({
        id: d.slug,
        label: `${d.firstName} ${d.lastName}`,
        group: "Députés",
        meta: d.circoLabel ?? d.departmentId ?? "",
      }),
    );
    data?.scrutins.forEach((s) =>
      list.push({
        id: s.id,
        label: s.titre,
        group: "Scrutins",
        meta: `Scrutin n°${s.numero}`,
      }),
    );
    return list;
  }, [data]);

  const applySearch = (value: string) => {
    setInput(value);
    navigate({
      search: (prev) => ({ ...prev, q: value.trim() || undefined }),
    });
  };

  const setType = (type: "depute" | "scrutin" | "all") => {
    navigate({ search: (prev) => ({ ...prev, type }) });
  };

  return (
    <div className="space-y-6 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary">Recherche</h1>
        <SearchCombobox
          value={input}
          onChange={setInput}
          onSelect={(opt) => {
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
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 ${
              search.type === t || (!search.type && t === "all")
                ? "bg-primary text-white shadow-sm"
                : "bg-surface text-text-secondary border border-border-light hover:bg-primary-bg-subtle hover:text-primary"
            }`}
          >
            {t === "all" ? "Tout" : t === "depute" ? "Députés" : "Scrutins"}
          </button>
        ))}
      </div>

      {search.theme && (
        <div className="flex items-center gap-2 rounded-lg border border-primary-bg bg-primary-bg-subtle px-4 py-2.5">
          <span className="text-sm font-medium text-text-secondary">
            Thématique
          </span>
          <span className="rounded-full bg-primary px-3 py-0.5 text-sm font-semibold capitalize text-white">
            {search.theme}
          </span>
        </div>
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {loadError && (
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

      {!isLoading && !loadError && (
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
                          navigate({
                            to: "/depute/$slug",
                            params: { slug: d.slug },
                            search: defaultDeputeSearch,
                          });
                        }}
                      >
                        {(d.photoUrl ?? getDeputyPhotoUrl(d.id)) ? (
                          <img
                            src={d.photoUrl ?? getDeputyPhotoUrl(d.id)}
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
                          navigate({
                            to: "/scrutin/$id",
                            params: { id: s.id },
                          });
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
                          <span className="capitalize">{s.titre}</span>
                        </p>
                      </a>
                    </Card>
                  ))}
                </div>
              </section>
            )}

          {!hasSearch ? (
            <EmptyState
              title="Recherchez un député ou un scrutin"
              description="Saisissez au moins 2 caractères ou sélectionnez une thématique pour afficher des résultats."
              icon={<Search className="h-10 w-10 text-text-muted" />}
            />
          ) : data.deputies.length === 0 && data.scrutins.length === 0 ? (
            <EmptyState
              title="Aucun résultat"
              description="Essayez avec d'autres termes de recherche."
              icon={<Search className="h-10 w-10 text-text-muted" />}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
