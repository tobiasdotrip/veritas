import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Search, Scale, Users, FileText } from "lucide-react";
import { useLatestScrutins } from "@/hooks/useLatestScrutins";
import { Card } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { BadgeResultat } from "@/components/ui/BadgeResultat";
import { formatDateShort } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HeroSearch() {
  const [q, setQ] = React.useState("");
  const navigate = Route.useNavigate();

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
        Transparence des votes
      </h1>
      <p className="max-w-xl text-text-secondary">
        Découvrez comment votent vos députés, comparez leurs positions et
        explorez les scrutins de l'Assemblée nationale.
      </p>
      <form
        className="flex w-full max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate({ to: "/recherche", search: { q: q.trim() } });
        }}
      >
        <Input
          type="search"
          placeholder="Rechercher un député ou un scrutin…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          iconLeft={<Search className="h-4 w-4" />}
          clearable
          className="h-12"
        />
        <Button type="submit" size="md">
          Rechercher
        </Button>
      </form>
    </div>
  );
}

function LatestScrutins() {
  const { data: scrutins, isLoading } = useLatestScrutins(6);

  return (
    <section className="py-8">
      <h2 className="mb-4 text-lg font-semibold text-text-primary">
        Derniers scrutins
      </h2>
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
                className="focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
                preload="intent"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-text-primary line-clamp-2">
                    Scrutin n°{s.numero}
                  </p>
                  <BadgeResultat resultat={s.sortCode} />
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {formatDateShort(s.dateScrutin)}
                </p>
                <p className="mt-2 text-sm text-text-secondary line-clamp-2">
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

function ThemesSection() {
  const themes = [
    { label: "Environnement", slug: "environnement" },
    { label: "Économie", slug: "economie" },
    { label: "Éducation", slug: "education" },
    { label: "Santé", slug: "sante" },
    { label: "Justice", slug: "justice" },
    { label: "Budget", slug: "budget" },
  ];

  return (
    <section className="py-8">
      <h2 className="mb-4 text-lg font-semibold text-text-primary">
        Thématiques
      </h2>
      <div className="flex flex-wrap gap-2">
        {themes.map((t) => (
          <Link
            key={t.slug}
            to="/recherche"
            search={{ theme: t.slug }}
            className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
            preload="intent"
          >
            {t.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function QuickLinks() {
  return (
    <section className="grid gap-4 py-8 sm:grid-cols-3">
      <Card variant="hoverable">
        <Link
          to="/recherche"
          className="flex flex-col items-center gap-2 p-4 text-center focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
          preload="intent"
        >
          <Users className="h-8 w-8 text-primary" aria-hidden="true" />
          <p className="font-medium text-text-primary">Députés</p>
          <p className="text-xs text-text-secondary">
            Parcourez les fiches et historiques de votes
          </p>
        </Link>
      </Card>
      <Card variant="hoverable">
        <Link
          to="/comparateur"
          className="flex flex-col items-center gap-2 p-4 text-center focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
          preload="intent"
        >
          <Scale className="h-8 w-8 text-primary" aria-hidden="true" />
          <p className="font-medium text-text-primary">Comparateur</p>
          <p className="text-xs text-text-secondary">
            Comparez les votes jusqu'à 5 députés
          </p>
        </Link>
      </Card>
      <Card variant="hoverable">
        <Link
          to="/recherche"
          search={{ type: "scrutin" }}
          className="flex flex-col items-center gap-2 p-4 text-center focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
          preload="intent"
        >
          <FileText className="h-8 w-8 text-primary" aria-hidden="true" />
          <p className="font-medium text-text-primary">Scrutins</p>
          <p className="text-xs text-text-secondary">
            Recherchez et analysez les scrutins
          </p>
        </Link>
      </Card>
    </section>
  );
}

function HomePage() {
  return (
    <div>
      <HeroSearch />
      <QuickLinks />
      <LatestScrutins />
      <ThemesSection />
    </div>
  );
}
