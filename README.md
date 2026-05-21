# Veritas — Transparence des Votes Parlementaires

> **"Connaître la vérité sur les votes de nos représentants"**

Veritas est une plateforme web citoyenne et open-source qui rend accessibles, vérifiables et comparables les votes des députés français à l'Assemblée Nationale.

## Vision

Les données des votes existent (Open Data de l'Assemblée Nationale), mais elles sont techniques, fragmentées et difficilement utilisables par le grand public. Veritas les restructure en une interface simple, rapide et neutre — pour que chaque citoyen puisse vérifier en quelques clics comment votent ses représentants.

## Fonctionnalités (MVP)

- **Recherche de députés** — Par nom, circonscription, département
- **Fiche député** — KPIs, historique des votes filtrable, pagination
- **Scrutin** — Détail d'un vote de l'Assemblée
- **Comparateur** — Jusqu'à 5 députés, score de concordance et divergences
- **Méthodologie** — Page explicative
- **Partage social** — OG images prévues (routes API en stub)

## Stack (implémentée)

| Couche              | Technologie                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| **Frontend**        | TanStack Start 1.168, TanStack Router, TanStack Query, **Vite 7**, Tailwind 4, Radix UI, Zustand |
| **Backend API**     | Fastify 5.8, Zod **4.4**, Drizzle 0.45, `fastify-type-provider-zod` 6                            |
| **Base de données** | PostgreSQL 17                                                                                    |
| **Recherche**       | PostgreSQL 17 (`to_tsvector` + GIN + `pg_trgm`)                                                  |
| **Cache**           | Redis 8                                                                                          |
| **ETL**             | Node.js streams, ZIP Open Data AN                                                                |

Voir le détail des versions et de l'état du code : **[État du projet](docs/ETAT_PROJET.md)** · **[Stack versions](docs/STACK_VERSIONS.md)**

## Structure du projet

```
veritas/
├── apps/
│   ├── frontend/          # TanStack Start (Vite) — UI & routes
│   └── backend/           # Fastify — API REST
├── packages/
│   ├── etl/               # Pipeline Open Data (ZIP → PostgreSQL)
│   └── shared/            # Schéma Drizzle, types, schémas Zod
├── docs/
│   ├── ETAT_PROJET.md     # État réel de l'implémentation
│   ├── STACK_VERSIONS.md
│   ├── research/          # Produit, UX, études techniques
│   └── architecture/      # Conception technique
├── docker-compose.yml     # Postgres 17, Redis 8
└── package.json           # pnpm workspaces + overrides (zod, h3)
```

## Documentation

| Document                                                            | Contenu                                             |
| ------------------------------------------------------------------- | --------------------------------------------------- |
| [État du projet](docs/ETAT_PROJET.md)                               | Implémentation actuelle, écarts, structure des apps |
| [Architecture globale](docs/architecture/architecture-technique.md) | Vue d'ensemble, flux, scaling                       |
| [Design backend](docs/architecture/backend-design.md)               | API, Drizzle, ETL                                   |
| [Design frontend](docs/architecture/frontend-design.md)             | Routes, composants, comparateur (cible produit)     |

## Démarrage rapide

**Prérequis** : Node.js ≥ 24, pnpm ≥ 10, Docker.

```bash
# Dépendances
pnpm install

# Infrastructure locale
docker compose up -d

# Variables backend
cp apps/backend/.env.example apps/backend/.env
# Ajuster DATABASE_URL, REDIS_URL si besoin

# Schéma BDD
pnpm db:migrate
pnpm db:seed   # optionnel

# Terminal 1 — API (port 3000)
pnpm --filter @veritas/backend dev

# Terminal 2 — Frontend (port 3001 par défaut)
# Optionnel : apps/frontend/.env avec VITE_API_BASE_URL=http://localhost:3000
pnpm --filter @veritas/frontend dev

# Import Open Data (nécessite DATABASE_URL)
pnpm etl:run
```

**Build production frontend** :

```bash
pnpm --filter @veritas/frontend build
pnpm --filter @veritas/frontend start   # node dist/server/server.js
```

## Scripts racine

| Commande          | Action                  |
| ----------------- | ----------------------- |
| `pnpm dev`        | Dev parallèle (Turbo)   |
| `pnpm build`      | Build tous les packages |
| `pnpm typecheck`  | Vérification TypeScript |
| `pnpm docker:up`  | Postgres + Redis        |
| `pnpm db:migrate` | Migrations Drizzle      |
| `pnpm etl:run`    | Pipeline ETL            |

## Sécurité

Mitigations applicatives (override `h3`, Zod 4, validation URLs ETL, anti zip-slip) : voir [État du projet](docs/ETAT_PROJET.md).

## Licence

Les données proviennent de l'[Open Data de l'Assemblée Nationale](https://data.assemblee-nationale.fr) sous Licence Ouverte 2.0.

Le code source sera publié sous licence AGPL-3.0.

---

_Projet citoyen — France, 2026_
