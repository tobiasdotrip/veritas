import { Link } from "@tanstack/react-router";
import { Container } from "./Container.js";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-raised py-8 mt-auto">
      <Container>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-primary">Veritas</p>
            <p className="text-xs text-text-muted">
              Transparence des votes parlementaires — Données Assemblée nationale.
            </p>
          </div>
          <nav className="flex flex-wrap gap-4 text-sm text-text-secondary">
            <Link
              to="/methodologie"
              className="hover:text-text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
              preload="intent"
            >
              Méthodologie
            </Link>
            <Link
              to="/"
              className="hover:text-text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
              preload="intent"
            >
              Accueil
            </Link>
            <a
              href="https://github.com/tobiasdotrip/veritas"
              target="_blank"
              rel="noreferrer"
              className="hover:text-text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
            >
              GitHub
            </a>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
