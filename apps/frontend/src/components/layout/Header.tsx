import * as React from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Search, Menu, X } from "lucide-react";
import { Container } from "./Container.js";
import { defaultRechercheSearch } from "@/lib/route-search.js";

export interface HeaderProps {
  onSearch?: (query: string) => void;
  searchValue?: string;
}

export function Header({
  onSearch,
  searchValue: controlledValue,
}: HeaderProps) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const isHomepage = routerState.location.pathname === "/";
  const [internalQuery, setInternalQuery] = React.useState("");
  const searchValue = controlledValue ?? internalQuery;
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const submitSearch = (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    if (onSearch) {
      onSearch(trimmed);
      return;
    }
    navigate({
      to: "/recherche",
      search: { ...defaultRechercheSearch, q: trimmed },
    });
  };

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-primary text-white transition-shadow duration-base",
        scrolled && "shadow-lg",
      )}
    >
      {/* Bande tricolore subtile en haut */}
      <div className="flex h-1">
        <div className="flex-1 bg-primary" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-accent" />
      </div>

      <Container>
        <div className="flex h-14 items-center gap-4 sm:h-16">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-white focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/50"
            preload="intent"
          >
            <span aria-hidden="true" className="text-xl">
              🏛️
            </span>
            Veritas
          </Link>

          <div
            className={cn("hidden flex-1 sm:block", isHomepage && "sm:hidden")}
          >
            <form
              role="search"
              className="mx-auto max-w-md"
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch(searchValue);
              }}
            >
              <Input
                type="search"
                placeholder="Rechercher un député ou un scrutin…"
                value={searchValue}
                onChange={(e) => {
                  const value = e.target.value;
                  if (onSearch || controlledValue !== undefined) {
                    onSearch?.(value);
                  } else {
                    setInternalQuery(value);
                  }
                }}
                iconLeft={<Search className="h-4 w-4 text-text-muted" />}
                clearable
                aria-label="Rechercher"
                className="h-10 border-white/20 bg-white/10 text-white placeholder:text-white/50 focus-visible:ring-white/30"
              />
            </form>
          </div>

          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              to="/comparateur"
              className="rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/30"
              preload="intent"
            >
              Comparateur
            </Link>
            <Link
              to="/methodologie"
              className="rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/30"
              preload="intent"
            >
              Méthodologie
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-md text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/30 sm:hidden"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {mobileOpen && (
          <div className="space-y-3 border-t border-white/10 pb-4 pt-3 sm:hidden">
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch(searchValue);
                setMobileOpen(false);
              }}
            >
              <Input
                type="search"
                placeholder="Rechercher…"
                value={searchValue}
                onChange={(e) => {
                  const value = e.target.value;
                  if (onSearch || controlledValue !== undefined) {
                    onSearch?.(value);
                  } else {
                    setInternalQuery(value);
                  }
                }}
                iconLeft={<Search className="h-4 w-4 text-text-muted" />}
                clearable
                aria-label="Rechercher"
                className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
              />
            </form>
            <nav className="flex flex-col gap-1">
              <Link
                to="/comparateur"
                className="rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/30"
                onClick={() => setMobileOpen(false)}
                preload="intent"
              >
                Comparateur
              </Link>
              <Link
                to="/methodologie"
                className="rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/30"
                onClick={() => setMobileOpen(false)}
                preload="intent"
              >
                Méthodologie
              </Link>
            </nav>
          </div>
        )}
      </Container>
    </header>
  );
}
