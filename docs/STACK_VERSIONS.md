# Stack technique — Versions et implémentation

**Dernière validation** : 2026-05-20  
**Lockfile** : `pnpm-lock.yaml` (overrides racine : `zod`, `h3`)

> **État du code** : voir [ETAT_PROJET.md](./ETAT_PROJET.md) pour ce qui est réellement branché dans le monorepo.

**Overrides pnpm (racine)** : `zod ^4.4.3`, `h3 ^1.15.9` (monorepo entier, y compris `@tanstack/router-plugin` / `start-plugin-core` — un seul Zod 4 requis pour le build Vite).

**Frontend build** : scripts `vite dev|build --configLoader native` ; `nanoid` en devDependency (peer implicite de PostCSS 8.5).

---

## Backend

| Dépendance                    | Version cible 2026 | Implémenté (`package.json`)    |
| ----------------------------- | ------------------ | ------------------------------ |
| **Node.js**                   | 24.x LTS           | `engines` racine `>=24`        |
| **Fastify**                   | 5.8.x              | `^5.8.0`                       |
| **Drizzle ORM**               | 0.45.2             | `^0.45.2`                      |
| **drizzle-zod**               | 0.8.x (Zod 4)      | `^0.8.3`                       |
| **Zod**                       | 4.4.x              | `^4.4.3` (+ override racine)   |
| **fastify-type-provider-zod** | 6.x (Zod ≥ 4.1.5)  | `^6.1.0`                       |
| **PostgreSQL**                | 17.x               | `postgres:17-alpine` (Compose) |
| **Redis**                     | 8.0.x              | `redis:8.0-alpine`             |
| **ioredis**                   | 5.10.x             | `^5.10.1`                      |

> **Note** : Meilisearch et BullMQ ont été retirés de la stack. Voir `docs/research/meilisearch-bullmq-analysis.md`.

## Frontend

| Dépendance          | Version cible 2026         | Implémenté                                     |
| ------------------- | -------------------------- | ---------------------------------------------- |
| **React**           | 19.2.x                     | `^19.2.0`                                      |
| **TanStack Start**  | 1.168.x                    | `^1.168.7`                                     |
| **TanStack Router** | 1.170.x                    | `^1.170.5`                                     |
| **TanStack Query**  | 5.100.x                    | `^5.100.11`                                    |
| **Vite**            | 7.x                        | `^7.0.0` (aligné peer `@tanstack/react-start`) |
| **Tailwind CSS**    | 4.3.x                      | `^4.3.0` + `@tailwindcss/postcss`              |
| **Radix UI**        | 1.x                        | `@radix-ui/react-*` ^1.1–1.2                   |
| **Zustand**         | 5.0.x                      | `^5.0.13`                                      |
| **TypeScript**      | 5.8–5.9 (monorepo ; pas 6) | `^5.8.3` → lockfile 5.9.x                      |
| **Satori**          | 0.26.x                     | `^0.26.0` (stubs OG)                           |

## ETL

| Dépendance          | Notes                                                    |
| ------------------- | -------------------------------------------------------- |
| **Zod**             | Non utilisé dans `packages/etl` (retiré des deps)        |
| **node-stream-zip** | Extraction avec garde zip-slip                           |
| URLs                | `validateEtlUrl` — HTTPS + `data.assemblee-nationale.fr` |

---

## Zod 4 — conventions du projet

```ts
// Dates requête (query)
z.iso.date().optional();

// Datetimes réponse (sérialisation Date | string)
z.preprocess(
  (val) => (val instanceof Date ? val.toISOString() : val),
  z.iso.datetime()
);

// Refinements / regex
.refine(fn, { error: "message" });
z.string().regex(/.../, { error: "message" });
```

Schémas partagés : `packages/shared/src/schemas/index.ts`  
Schémas routes : inline dans `apps/backend/src/modules/*/routes.ts` + `common/schemas.ts`

---

## Breaking changes (référence migration)

### Fastify 4 → 5

- Schémas JSON complets (`querystring`, `params`, `response`)
- Node.js ≥ 20

### Tailwind 3 → 4

- Config CSS-first (`src/app.css` + `@theme`)
- Plus de `tailwind.config.js` requis dans ce repo

### Zod 3 → 4

- `z.string().date()` → `z.iso.date()`
- `z.string().datetime()` → `z.iso.datetime()`
- Messages custom : `{ error: "…" }` plutôt que `{ message: "…" }` dans les refinements

### TanStack Start : Vinxi → Vite

- `vite.config.ts` + `tanstackStart()` — voir [ETAT_PROJET.md](./ETAT_PROJET.md)

---

## Notes de vigilance

| Composant          | Note                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------- |
| **TanStack Start** | RC — verrouiller la version exacte en production                                        |
| **TypeScript 6**   | Non adopté — monorepo en 5.9 ; migration quand l’écosystème (Drizzle Kit, plugins) suit |
| **Tests / CI**     | Vitest présent, 0 tests ; pas de GitHub Actions                                         |
| **Satori / OG**    | Routes stub, non exposées au route tree                                                 |
| **Redis 8**        | Licence RSALv2/SSPL — vérifier conformité déploiement                                   |

---

_Document aligné sur le dépôt — 2026-05-20_
