# État du projet — Veritas

**Dernière mise à jour** : 2026-05-22  
**Branche de référence** : monorepo `pnpm` workspaces (apps + packages)

Ce document décrit l’**implémentation réelle** du dépôt. Les specs de conception (`docs/architecture/`, `docs/research/`) restent la cible produit ; en cas de divergence, ce fichier et le code font foi.

---

## Monorepo

| Package           | Rôle                                         | Scripts principaux                      |
| ----------------- | -------------------------------------------- | --------------------------------------- |
| `apps/frontend`   | UI TanStack Start + Vite                     | `dev`, `build`, `start`                 |
| `apps/backend`    | API REST Fastify                             | `dev`, `build`, `db:migrate`, `db:seed` |
| `packages/shared` | Schémas Drizzle, types, schémas Zod partagés | `build`, `typecheck`                    |
| `packages/etl`    | Pipeline Open Data AN                        | `start` (via `pnpm etl:run`)            |

**Outils** : Node ≥ 24, pnpm 10, Turbo pour `dev` / `build` / `test` à la racine.

**Overrides racine** (`package.json`) : `h3 ^1.15.9`, `zod ^4.4.3` (une seule version dans le lockfile).

---

## Stack implémentée

| Couche      | Technologie                                           | Version lockée (ordre de grandeur)  |
| ----------- | ----------------------------------------------------- | ----------------------------------- |
| Frontend    | TanStack Start, TanStack Router, TanStack Query, Vite | Start 1.168, Router 1.170, Vite 7.x |
| Styling     | Tailwind CSS v4 (`@theme` dans `app.css`)             | 4.3                                 |
| Backend     | Fastify 5 + `fastify-type-provider-zod` 6             | Zod **4.4.3**                       |
| ORM         | Drizzle 0.45 + `drizzle-zod` 0.8                      | Schéma dans `@veritas/shared`       |
| BDD / cache | PostgreSQL 17, Redis 8                                | `docker-compose.yml`                |

> **Note** : Meilisearch et BullMQ ont été retirés de la stack après étude (`docs/research/meilisearch-bullmq-analysis.md`). La recherche repose sur PostgreSQL (`to_tsvector` + GIN + `pg_trgm`).
> | ETL | Node streams, `node-stream-zip`, `stream-json` | Pas de Zod runtime (validation URLs au boot) |

**Abandonné** : Vinxi (`app.config.ts` supprimé) — build frontend via **Vite** + plugin `@tanstack/react-start/plugin/vite`.

**Build** : Vite 7 + `@vitejs/plugin-react` 4.7 (peer `@tanstack/react-start` satisfait).

---

## Frontend (`apps/frontend`)

### Structure actuelle

```
apps/frontend/
├── vite.config.ts          # tanstackStart() + @vitejs/plugin-react
├── postcss.config.mjs      # @tailwindcss/postcss
├── src/
│   ├── router.tsx          # createRouter + routeTree.gen.ts
│   ├── app.css             # @import "tailwindcss" + @theme { tokens }
│   ├── routes/             # file-based (TanStack Router)
│   ├── components/
│   ├── hooks/              # useDepute, useDeputeVotes (infinite), useComparison, …
│   └── stores/             # comparator-store (Zustand + persist)
└── dist/                   # client/ + server/ après vite build
```

### Routes livrées

| Route           | Fichier                   | Données                                    |
| --------------- | ------------------------- | ------------------------------------------ |
| `/`             | `routes/index.tsx`        | Accueil, derniers scrutins                 |
| `/recherche`    | `routes/recherche.tsx`    | Recherche députés / scrutins               |
| `/depute/$slug` | `routes/depute/$slug.tsx` | Fiche + votes paginés (`useInfiniteQuery`) |
| `/scrutin/$id`  | `routes/scrutin/$id.tsx`  | Détail scrutin                             |
| `/comparateur`  | `routes/comparateur.tsx`  | Comparateur (slugs → API `/compare`)       |
| `/methodologie` | `routes/methodologie.tsx` | Page statique                              |

### API client

- Base URL : `VITE_API_BASE_URL` (défaut `http://localhost:3000`)
- Réponses typées avec enveloppe `{ data, meta? }` (`api-client.ts`, `api-types.ts`)

### Comparateur

- Sélection : Zustand (`comparator-store`) — référence + jusqu’à 4 comparés
- Périodes : `7j` \| `30j` \| `6mois` \| `legislature` → `from` ISO (`YYYY-MM-DD`) côté `useComparison` ; pas de `from` pour `legislature`
- API : `GET /compare?deputies=slug1,slug2,...` (résolution slug ou `PA…` côté backend)

### Non implémenté / stubs

- Stubs OG frontend (`apps/frontend/stubs/og/`) — remplacés par le backend `/api/v1/og/*`
- Server Functions / prefetch SSR documentés dans `frontend-design.md` : **non** utilisés ; fetching **client** via TanStack Query vers le backend

---

## Backend (`apps/backend`)

### Modules API

| Préfixe     | Module     | Notes                                                              |
| ----------- | ---------- | ------------------------------------------------------------------ |
| `/deputies` | `deputies` | Fiche, votes (cursor), stats                                       |
| `/scrutins` | `scrutins` | Liste, détail, votes individuels                                   |
| `/groups`   | `groups`   | Groupes politiques + stats                                         |
| `/compare`  | `compare`  | Concordance multi-députés                                          |
| `/search`   | `search`   | Suggestions + recherche full-text PostgreSQL (`to_tsvector` + GIN) |
| `/themes`   | `themes`   | Liste thématiques + compteurs scrutins par législature             |
| `/og`       | `og`       | Images Open Graph Satori (député, scrutin, comparateur)            |

### Validation

- **Zod 4** : dates requête `z.iso.date()`, réponses datetime `z.iso.datetime()` via `DateString` (`modules/common/schemas.ts`)
- Erreurs validation : RFC 7807 (`plugins/error-handler.ts`)

### Variables d’environnement

Voir `apps/backend/.env.example`. Le backend charge `dotenv` au démarrage ; l’ETL utilise `DATABASE_URL` et les variables documentées dans `packages/etl/src/config.ts`.

---

## ETL (`packages/etl`)

### Pipeline

1. Téléchargement ZIP (`downloader.ts`) — hash SHA-256, reprise `ETag` / `Last-Modified`
2. Extraction JSON (`parser/zip-extract.ts` + `safe-zip-path.ts`) — **protection zip slip**
3. Parsing stream (`parser/scrutins.ts`, `parser/deputies.ts`)
4. Chargement PostgreSQL (`loader.ts`)

### URLs

- Hôte autorisé : `data.assemblee-nationale.fr` uniquement (`validateEtlUrl`)
- Surcharge : `ETL_URL_SCRUTINS`, `ETL_URL_DEPUTIES`, `ETL_URL_ORGANES`
- Répertoire temporaire : `TEMP_DIR` (défaut `./tmp/etl`)

---

## Shared (`packages/shared`)

- `db/schema.ts` — schéma Drizzle partagé backend + ETL
- `schemas/index.ts` — schémas Zod 4 (requêtes type OpenAPI)
- `types/index.ts` — types métier exportés vers le frontend

---

## Sécurité (mitigations en place)

| Risque                                 | Mitigation                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| CVE `h3` < 1.15.9                      | Override pnpm racine `h3 ^1.15.9`                                                             |
| CVE-2026-45321 (TanStack Router/Start) | Versions hors fenêtre malveillante ; `pnpm audit:tanstack` ; deps `>= 1.170.5` / `>= 1.168.7` |
| SSRF ETL                               | `validateEtlUrl` (HTTPS + hôte AN)                                                            |
| Zip slip                               | `resolveSafeZipEntryPath` avant extraction                                                    |
| Zip entry types                        | `assertSafeZipArchive` (rejette symlink, FIFO, device, socket)                                |
| Dépendances                            | Voir `docs/STACK_VERSIONS.md`                                                                 |

---

## Qualité & CI

| Élément                    | État                                                                           |
| -------------------------- | ------------------------------------------------------------------------------ |
| Tests automatisés          | Vitest + Playwright, 227 Vitest (148 unit. + 65 intég. + 14 frontend) + 16 E2E |
| GitHub Actions             | Configuré (`.github/workflows/ci.yml`) — lint, typecheck, tests                |
| `pnpm typecheck` / `build` | OK sur shared, backend, etl, frontend                                          |

---

## Écarts connus vs audits récents

Corrigés récemment (voir historique PR / agents) :

- Comparateur : périodes + slugs, bouton retirer référence
- Pagination votes député : `useInfiniteQuery` + bouton « Charger plus »
- Frontend : migration Vinxi → Vite
- Zod 4 sur backend + shared
- ETL : zip slip, validation URLs, hash téléchargement (stream unique)
- ETL : validation port dans `validateEtlUrl` (production rejette port ≠ 443)
- ETL : scan complet des entrées ZIP (`assertSafeZipArchive`, filtre types spéciaux, symlinks)
- Backend : limite cursor (`MAX_CURSOR_LENGTH` = 2048, `ValidationError` si trop grand)
- Backend : tests CacheService (13 tests, mock Redis en mémoire)
- Backend : `toPrefixTsQuery` corrigé (préfixe chaque mot), extrait dans `ts-query.ts` + 15 tests
- Backend : `unaccent()` + normalisation `ts_rank / length()` dans toutes les requêtes full-text
- Backend : validation Zod `ThemeSlug` (regex + max 50) sur `scrutins/routes.ts` et `recherche.tsx`
- Frontend : stubs OG déplacés `routes/api/og/` → `stubs/og/` (hors `src/`, neutralise activation silencieuse)
- Backend : infrastructure intégration (`fixtures.ts`, `integration.ts`, `vitest.integration.config.ts`)
- Backend : module `GET /api/v1/themes`, paramètre `theme` sur `/search` et `/search/suggestions`
- Backend : fallback `pg_trgm` via `word_similarity` pour requêtes ≤ 3 caractères
- Backend : module OG Satori `/api/v1/og/*` (validation Zod, police Inter, cache HTTP 24h)
- Backend : correction `groups/routes.ts` (`position::text` dans CTE loyauté)
- Backend : 65 tests d'intégration (+ groups 3, og 5, trigram 1)
- E2E : 16 scénarios Playwright (8 API en CI)
- Frontend : 14 tests Vitest (hooks + composants UI)
- CI : étape Integration tests avec PostgreSQL + Redis

**En cours** (hors roadmap audits) :

- 🔴 Couverture tests — 227 Vitest passent ; reste pages/composants frontend métier
- 🟠 Intégration/E2E — frontend E2E skip CI sans `E2E_FRONTEND_BASE_URL` + seed production
- 🟡 Filtre thématique croisé — frontend conserve double appel `/scrutins?theme=` (API unifiée disponible)

---

_Pour les versions cibles et CVE : `docs/STACK_VERSIONS.md`. Pour les audits récents : rapports QA, Security et Tech Lead (voir historique agents)._

---

## Notes 2026-05-22

- **Docs obsolètes supprimés** : `BENCHMARK_JEST_VS_VITEST.md` (décision prise, Vitest adopté), `SECURITY_AUDIT_TESTS.md` (recommandations intégrées ci-dessus), `.DS_Store`.
- **Semaine 1** (blocages) : `toPrefixTsQuery` corrigé, `unaccent()`, `ts_rank` normalisé, validation `ThemeSlug`, OG stubs déplacés, 3 audits croisés (`docs/audits/`).
- **Semaine 2** (intégration) : fixtures déterministes, 25 tests intégration, CI PostgreSQL + Redis.
- **Semaine 3** (couverture backend) : tests repository scrutins (9), routes deputies (8), routes scrutins (9), compare routes+repo (13).
- **Semaine 4** (thèmes, E2E, frontend) : module themes, `search?theme=`, 6 tests intégration themes/search, 13 E2E, 14 tests frontend.
- **Semaine 5** (OG, groups, pg_trgm) : module `/api/v1/og/*`, tests groups (3), fallback trigram, 16 E2E.
- **Tests** : 148 unitaires + 65 intégration + 14 frontend = 227 Vitest ; roadmap audits (`synthese-5-ouverts.md`) terminée.

## Notes 2026-05-21

- **Meilisearch retiré** : la recherche full-text utilise PostgreSQL nativement (`to_tsvector`, GIN, `pg_trgm`).
- **BullMQ retiré** : l'ETL reste sur `node-cron` ; pas de jobs asynchrones divers pour l'instant.
- **Docs obsolètes supprimés** : `AUDIT_SYNTHESIS.md`, `SECURITY_AUDIT.md`, `AUDIT_COMPLET_2026-05-21.md`.
- **Étude** : `docs/research/meilisearch-bullmq-analysis.md` justifie ces retraits.
