import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Scale, Users, FileText, TrendingUp } from "lucide-react";
import { useLatestScrutins } from "@/hooks/useLatestScrutins";
import { Card } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { BadgeResultat } from "@/components/ui/BadgeResultat";
import { formatDateShort, formatTitle } from "@/lib/utils";
import { defaultRechercheSearch } from "@/lib/route-search";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HeroSearch() {
  const [q, setQ] = React.useState("");
  const navigate = Route.useNavigate();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[#1a1aa8] to-primary px-6 py-10 text-white sm:px-10 sm:py-12">
      {/* Motif de grille très discret, masqué au centre par un vignette */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, black 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, black 70%)",
        }}
      />
      {/* Glow subtil centré en haut */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, #6a6af4, transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-primary shadow-sm">
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          Données de l'Assemblée nationale
        </div>

        <h1 className="text-4xl font-extrabold leading-tight tracking-tight !text-white sm:text-5xl lg:text-[3.25rem]">
          Transparence des votes
          <br className="hidden sm:block" />
          <span className="sm:hidden"> </span>
          parlementaires
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-center text-base text-white/90 sm:text-lg">
          Découvrez comment votent vos députés, comparez leurs positions et
          explorez les scrutins de l'Assemblée nationale.
        </p>

        <form
          className="mx-auto mt-5 flex w-full max-w-lg flex-row items-center justify-center gap-3"
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
            placeholder="Nom, loi, scrutin…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            clearable
            className="h-12 flex-1 rounded-xl border-white/30 bg-white px-4 text-text-primary shadow-sm placeholder:font-normal placeholder:text-text-muted focus-visible:bg-white"
          />
          <Button
            type="submit"
            size="md"
            className="h-12 !rounded-xl !bg-white !px-6 !text-primary shadow-[0_4px_14px_rgba(0,0,0,0.25)] hover:!bg-white/95"
          >
            Rechercher
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/80">
          <span className="hidden sm:inline" aria-hidden="true">
            Ou explorez :
          </span>
          <Link
            to="/recherche"
            search={{ ...defaultRechercheSearch, type: "scrutin" }}
            className="underline underline-offset-4 transition-colors hover:text-white focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/30"
            preload="intent"
          >
            Derniers scrutins
          </Link>
          <Link
            to="/recherche"
            search={defaultRechercheSearch}
            className="underline underline-offset-4 transition-colors hover:text-white focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/30"
            preload="intent"
          >
            Députés
          </Link>
          <Link
            to="/comparateur"
            className="underline underline-offset-4 transition-colors hover:text-white focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/30"
            preload="intent"
          >
            Comparateur
          </Link>
        </div>
      </div>
    </div>
  );
}

function LatestScrutins() {
  const { data: scrutins, isLoading } = useLatestScrutins(6);

  return (
    <section className="py-10">
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-border-light pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">
          Derniers scrutins
        </h2>
        <Link
          to="/recherche"
          search={{ ...defaultRechercheSearch, type: "scrutin" }}
          className="inline-flex items-center gap-1 text-base font-semibold text-primary hover:text-primary-hover focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
          preload="intent"
        >
          Voir tout
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {isLoading && (
        <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
      {scrutins && (
        <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scrutins.map((s) => (
            <Card
              key={s.id}
              variant="hoverable"
              className="border-border bg-white p-0"
            >
              <Link
                to="/scrutin/$id"
                params={{ id: s.id }}
                className="group flex flex-col focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
                preload="intent"
              >
                <div className="flex flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-text-primary">
                      {formatDateShort(s.dateScrutin)}
                    </span>
                    <BadgeResultat resultat={s.sortCode} size="lg" />
                  </div>
                  <p className="mt-2 text-pretty text-base font-semibold leading-snug text-text-primary line-clamp-3">
                    {formatTitle(s.titre)}
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    Scrutin n°{s.numero}
                  </p>
                </div>
                <div className="flex items-center justify-end border-t border-border-light px-4 py-2.5">
                  <span className="text-sm font-medium text-primary transition-transform duration-base group-hover:translate-x-0.5">
                    Voir le scrutin
                    <span aria-hidden="true"> →</span>
                  </span>
                </div>
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
      <Card
        variant="hoverable"
        className="border-l-4 border-l-primary bg-primary-bg-subtle"
      >
        <Link
          to="/recherche"
          search={defaultRechercheSearch}
          className="group flex items-start gap-4 focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
          preload="intent"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white transition-transform duration-base group-hover:scale-105">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="text-base font-bold text-text-primary">
              Députés
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">
              Fiches et historiques de votes
            </p>
          </div>
        </Link>
      </Card>

      <Card
        variant="hoverable"
        className="border-l-4 border-l-accent bg-accent-bg"
      >
        <Link
          to="/comparateur"
          className="group flex items-start gap-4 focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
          preload="intent"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white transition-transform duration-base group-hover:scale-105">
            <Scale className="h-5 w-5 text-accent" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="text-base font-bold text-text-primary">
              Comparateur
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">
              Comparez jusqu'à 5 députés
            </p>
          </div>
        </Link>
      </Card>

      <Card
        variant="hoverable"
        className="border-l-4 border-l-success bg-success-bg"
      >
        <Link
          to="/recherche"
          search={{ ...defaultRechercheSearch, type: "scrutin" }}
          className="group flex items-start gap-4 focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
          preload="intent"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white transition-transform duration-base group-hover:scale-105">
            <FileText className="h-5 w-5 text-success" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="text-base font-bold text-text-primary">
              Scrutins
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">
              Recherchez et analysez les votes
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
