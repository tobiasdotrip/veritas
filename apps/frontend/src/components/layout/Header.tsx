import * as React from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Search, Menu, X } from "lucide-react";
import { Container } from "./Container.js";

export interface HeaderProps {
  onSearch?: (query: string) => void;
  searchValue?: string;
}

export function Header({ onSearch, searchValue = "" }: HeaderProps) {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-transparent bg-surface/90 backdrop-blur transition-all duration-base",
        scrolled && "border-border shadow-sm"
      )}
    >
      <Container>
        <div className="flex h-14 items-center gap-4 sm:h-16">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
            preload="intent"
          >
            Veritas
          </Link>

          <div className="hidden flex-1 sm:block">
            <form
              role="search"
              className="mx-auto max-w-md"
              onSubmit={(e) => {
                e.preventDefault();
                if (onSearch && searchValue.trim().length > 0) {
                  onSearch(searchValue);
                }
              }}
            >
              <Input
                type="search"
                placeholder="Rechercher un député ou un scrutin…"
                value={searchValue}
                onChange={(e) => onSearch?.(e.target.value)}
                iconLeft={<Search className="h-4 w-4" />}
                clearable
                aria-label="Rechercher"
                className="h-10"
              />
            </form>
          </div>

          <nav className="hidden items-center gap-4 sm:flex">
            <Link
              to="/comparateur"
              className="text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
              preload="intent"
            >
              Comparateur
            </Link>
            <Link
              to="/methodologie"
              className="text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
              preload="intent"
            >
              Méthodologie
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-text-secondary hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30 sm:hidden"
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
          <div className="space-y-3 border-t border-border pb-4 pt-3 sm:hidden">
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                if (onSearch && searchValue.trim().length > 0) {
                  onSearch(searchValue);
                  setMobileOpen(false);
                }
              }}
            >
              <Input
                type="search"
                placeholder="Rechercher…"
                value={searchValue}
                onChange={(e) => onSearch?.(e.target.value)}
                iconLeft={<Search className="h-4 w-4" />}
                clearable
                aria-label="Rechercher"
              />
            </form>
            <nav className="flex flex-col gap-2">
              <Link
                to="/comparateur"
                className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
                onClick={() => setMobileOpen(false)}
                preload="intent"
              >
                Comparateur
              </Link>
              <Link
                to="/methodologie"
                className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
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
