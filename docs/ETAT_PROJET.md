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

- Routes `src/routes/api/og/*` : stubs Satori (`createAPIFileRoute` non branché au route tree)
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
| Dépendances                            | Voir `docs/STACK_VERSIONS.md`                                                                 |

---

## Qualité & CI

| Élément                    | État                                                            |
| -------------------------- | --------------------------------------------------------------- |
| Tests automatisés          | Vitest, 10 fichiers, 90 tests, couverture 3,58 %                |
| GitHub Actions             | Configuré (`.github/workflows/ci.yml`) — lint, typecheck, tests |
| `pnpm typecheck` / `build` | OK sur shared, backend, etl, frontend                           |

---

## Écarts connus vs audits récents

Corrigés récemment (voir historique PR / agents) :

- Comparateur : périodes + slugs, bouton retirer référence
- Pagination votes député : `useInfiniteQuery` + bouton « Charger plus »
- Frontend : migration Vinxi → Vite
- Zod 4 sur backend + shared
- ETL : zip slip, validation URLs, hash téléchargement (stream unique)

**Toujours ouverts** (à traiter) : couverture tests, intégration/E2E, biais suggestions recherche, filtre thématique croisé, route OG non branchée.

### Points de vigilance sécurité (audit 2026-05-21)

| Priorité | Action                                                  | Fichier concerné                                |
| -------- | ------------------------------------------------------- | ----------------------------------------------- |
| Haute    | Valider le port dans `validateEtlUrl` (port ≠ 443)      | `packages/etl/src/config.ts`                    |
| Haute    | Limiter la taille du cursor dans `decodeCursor` (~2 KB) | `apps/backend/src/modules/common/pagination.ts` |
| Moyenne  | Tests d'intégration CacheService (mock Redis)           | `apps/backend/src/modules/common/cache.ts`      |
| Faible   | Vérifier le type d'entrée ZIP (symlinks)                | `packages/etl/src/parser/zip-extract.ts`        |

---

_Pour les versions cibles et CVE : `docs/STACK_VERSIONS.md`. Pour les audits récents : rapports QA, Security et Tech Lead (voir historique agents)._

---

## Notes 2026-05-22

- **Docs obsolètes supprimés** : `BENCHMARK_JEST_VS_VITEST.md` (décision prise, Vitest adopté), `SECURITY_AUDIT_TESTS.md` (recommandations intégrées ci-dessus), `.DS_Store`.
- **Tests** : 10 fichiers, 90 tests (88 passés, 2 skipped).

## Notes 2026-05-21

- **Meilisearch retiré** : la recherche full-text utilise PostgreSQL nativement (`to_tsvector`, GIN, `pg_trgm`).
- **BullMQ retiré** : l'ETL reste sur `node-cron` ; pas de jobs asynchrones divers pour l'instant.
- **Docs obsolètes supprimés** : `AUDIT_SYNTHESIS.md`, `SECURITY_AUDIT.md`, `AUDIT_COMPLET_2026-05-21.md`.
- **Étude** : `docs/research/meilisearch-bullmq-analysis.md` justifie ces retraits.
