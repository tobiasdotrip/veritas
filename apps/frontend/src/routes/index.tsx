import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Search, Scale, Users, FileText, TrendingUp } from "lucide-react";
import { useLatestScrutins } from "@/hooks/useLatestScrutins";
import { Card } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { BadgeResultat } from "@/components/ui/BadgeResultat";
import { formatDateShort } from "@/lib/utils";
import { defaultRechercheSearch } from "@/lib/route-search";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HeroSearch() {
  const [q, setQ] = React.useState("");
  const navigate = Route.useNavigate();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-16 text-center text-white sm:py-20">
      {/* Motif de fond subtil */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-2xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80 backdrop-blur">
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          Données de l'Assemblée nationale
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          Transparence
          <br />
          des votes parlementaires
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-white/80 sm:text-lg">
          Découvrez comment votent vos députés, comparez leurs positions et
          explorez les scrutins de l'Assemblée nationale.
        </p>

        <form
          className="mx-auto mt-8 flex w-full max-w-lg gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim())
              navigate({
                to: "/recherche",
                search: { ...defaultRechercheSearch, q: q.trim() },
              });
          }}
        >
          <Input
            type="search"
            placeholder="Rechercher un député ou un scrutin…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            iconLeft={<Search className="h-4 w-4 text-text-muted" />}
            clearable
            className="h-12 border-white/20 bg-white text-text-primary placeholder:text-text-muted"
          />
          <Button
            type="submit"
            size="md"
            className="bg-white !text-primary hover:bg-white/90"
          >
            Rechercher
          </Button>
        </form>
      </div>
    </div>
  );
}

function LatestScrutins() {
  const { data: scrutins, isLoading } = useLatestScrutins(6);

  return (
    <section className="py-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary">
          Derniers scrutins
        </h2>
        <Link
          to="/recherche"
          search={{ ...defaultRechercheSearch, type: "scrutin" }}
          className="text-sm font-semibold text-primary hover:text-primary-hover focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
          preload="intent"
        >
          Voir tout →
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
      {scrutins && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scrutins.map((s) => (
            <Card key={s.id} variant="hoverable">
              <Link
                to="/scrutin/$id"
                params={{ id: s.id }}
                className="focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
                preload="intent"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary line-clamp-2">
                    Scrutin n°{s.numero}
                  </p>
                  <BadgeResultat resultat={s.sortCode} />
                </div>
                <p className="mt-1.5 text-xs text-text-muted">
                  {formatDateShort(s.dateScrutin)}
                </p>
                <p className="mt-2 text-sm text-text-secondary line-clamp-2 capitalize">
                  {s.titre}
                </p>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function QuickLinks() {
  return (
    <section className="grid gap-4 py-8 sm:grid-cols-3">
      <Card variant="hoverable">
        <Link
          to="/recherche"
          search={defaultRechercheSearch}
          className="flex flex-col items-center gap-3 p-4 text-center focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
          preload="intent"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-bg">
            <Users className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold text-text-primary">Députés</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              Parcourez les fiches et historiques de votes
            </p>
          </div>
        </Link>
      </Card>

      <Card variant="hoverable">
        <Link
          to="/comparateur"
          className="flex flex-col items-center gap-3 p-4 text-center focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
          preload="intent"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-bg">
            <Scale className="h-7 w-7 text-accent" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold text-text-primary">Comparateur</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              Comparez les votes jusqu'à 5 députés
            </p>
          </div>
        </Link>
      </Card>

      <Card variant="hoverable">
        <Link
          to="/recherche"
          search={{ ...defaultRechercheSearch, type: "scrutin" }}
          className="flex flex-col items-center gap-3 p-4 text-center focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
          preload="intent"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-success-bg">
            <FileText className="h-7 w-7 text-success" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold text-text-primary">Scrutins</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              Recherchez et analysez les scrutins
            </p>
          </div>
        </Link>
      </Card>
    </section>
  );
}

function ThemesSection() {
  const themes = [
    { label: "Environnement", slug: "environnement" },
    { label: "Économie", slug: "economie" },
    { label: "Éducation", slug: "education" },
    { label: "Santé", slug: "sante" },
    { label: "Sécurité", slug: "securite" },
    { label: "Travail", slug: "travail" },
  ];

  return (
    <section className="py-10">
      <h2 className="mb-4 text-xl font-bold text-text-primary">Thématiques</h2>
      <div className="flex flex-wrap gap-2">
        {themes.map((t) => (
          <Link
            key={t.slug}
            to="/recherche"
            search={{ ...defaultRechercheSearch, theme: t.slug }}
            className="inline-flex items-center rounded-full border border-border-light bg-surface px-4 py-2 text-sm font-medium text-text-secondary shadow-sm transition-all hover:border-primary-bg hover:bg-primary-bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
            preload="intent"
          >
            {t.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function HomePage() {
  return (
    <div className="py-8">
      <HeroSearch />
      <QuickLinks />
      <LatestScrutins />
      <ThemesSection />
    </div>
  );
}
