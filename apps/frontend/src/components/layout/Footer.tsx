import { Link } from "@tanstack/react-router";
import { Container } from "./Container.js";

export function Footer() {
  return (
    <footer className="mt-auto bg-primary text-white">
      <div className="flex h-1">
        <div className="flex-1 bg-primary" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-accent" />
      </div>
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <p className="text-lg font-bold tracking-tight">
              <span aria-hidden="true" className="mr-2">
                🏛️
              </span>
              Veritas
            </p>
            <p className="max-w-md text-sm text-white/70">
              Transparence des votes parlementaires — Données ouvertes de
              l'Assemblée nationale.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
            <Link
              to="/methodologie"
              className="hover:text-white focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/30"
              preload="intent"
            >
              Méthodologie
            </Link>
            <Link
              to="/"
              className="hover:text-white focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/30"
              preload="intent"
            >
              Accueil
            </Link>
            <a
              href="https://github.com/tobiasdotrip/veritas"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/30"
            >
              GitHub
            </a>
          </nav>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/40">
          Projet indépendant — non affilié aux institutions publiques
        </div>
      </Container>
    </footer>
  );
}
