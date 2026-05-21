# Benchmark Jest vs Vitest — Veritas

**Date** : 2026-05-21  
**Contexte** : Monorepo pnpm, Node ≥ 24, ESM natif, Vite 7 frontend, Fastify 5 backend, TypeScript 5.8+, Turbo, Vitest 3.1.0 déjà installé (0 test écrit).

---

## 1. Résumé exécutif

| Critère | Jest 30.x | Vitest 3.x / 4.x | Verdict pour Veritas |
|---------|-----------|------------------|----------------------|
| **Vitesse exécution (cold)** | ~142s (suite large) | ~43s | ✅ Vitest 3.3x plus rapide |
| **Watch mode (1 fichier)** | ~8.4s | ~0.3s | ✅ Vitest 28x plus rapide |
| **Mémoire** | ~2.1 GB pic | ~890 MB | ✅ Vitest -58% |
| **ESM natif** | ⚠️ Experimental (`--experimental-vm-modules`) | ✅ Natif, par défaut | ✅ Vitest |
| **TypeScript** | Nécessite `ts-jest` ou `@swc/jest` | ✅ Zero-config (esbuild via Vite) | ✅ Vitest |
| **Config Vite** | Duplication (`jest.config.js` + `vite.config.ts`) | ✅ Réutilise `vite.config.ts` | ✅ Vitest |
| **API / Migration** | Référence | ~95% compatible Jest | ✅ Vitest (drop-in) |
| **Monorepo / Workspaces** | Config par package | ✅ Workspace natif inline (v3+) | ✅ Vitest |
| **Browser mode** | jsdom uniquement | ✅ Vrai navigateur (Playwright) | ✅ Vitest |
| **React Native** | ✅ Seul choix viable | ❌ Non supporté | — N/A pour Veritas |
| **CI / Sharding** | ✅ | ✅ (blob reporter + merge) | Équivalent |
| **Downloads npm (semaine)** | ~30M | ~14M (x3.5 en 2 ans) | Jest domine, Vitest croît |
| **Stars GitHub** | ~45K | ~16K | Jest plus mature |

**Recommandation** : **Vitest** — déjà installé, aligné avec la stack Vite/ESM/TS du projet, et supérieur sur tous les critères techniques pertinents pour Veritas.

---

## 2. Contexte technique du projet

Veritas est configuré comme un projet **moderne ESM-first** :

- `"type": "module"` dans tous les `package.json`
- **Vite 7** au frontend (build, dev server, plugins)
- **TypeScript 5.8+** natif, sans Babel
- **Monorepo pnpm** avec Turbo (`turbo run test`)
- **Vitest 3.1.0** déjà présent en `devDependencies` dans `@veritas/frontend` et `@veritas/backend`
- **Aucun test** n'est encore écrit (`find` ne retourne aucun `*.test.ts` / `*.spec.ts`)

Ce contexte rend **Jest particulièrement mal adapté** : il faudrait ajouter `ts-jest`, gérer le flag `--experimental-vm-modules`, maintenir une config `jest.config.js` séparée de Vite, et gérer les interop CJS/ESM.

---

## 3. Comparaison technique détaillée

### 3.1 Performance

Les benchmarks 2026 sur des suites réelles montrent des écarts significatifs :

| Scénario | Jest 30 | Vitest 4 | Écart |
|----------|---------|----------|-------|
| Full suite cold | 142s | 43s | **3.3x** |
| Full suite cached | 98s | 28s | **3.5x** |
| Watch mode (1 fichier) | 8.4s | 0.3s | **28x** |
| Mémoire pic | 2.1 GB | 890 MB | **-58%** |

**Pourquoi Vitest est plus rapide ?**

- **Transform** : Vitest utilise **esbuild** (via Vite) pour TypeScript/JSX. Jest utilise Babel ou `ts-jest` (10–100x plus lent).
- **Module graph** : Vitest réutilise le graphe d'imports de Vite. En watch mode, il ne relance que les tests **transitivement affectés** par le fichier modifié (comme HMR). Jest utilise des heuristiques basées sur `git diff`.
- **Workers** : Vitest utilise des **worker threads** (légers). Jest spawn des **processus Node.js** complets (coût mémoire et CPU élevé).

### 3.2 ESM (ECMAScript Modules)

Veritas est ESM natif. C'est un point critique.

**Jest 30** :
- Support ESM marqué **experimental** dans la documentation officielle
- Nécessite le flag Node `--experimental-vm-modules`
- `jest.mock()` ne fonctionne pas nativement avec ESM → `jest.unstable_mockModule()` (async, factory obligatoire)
- `import.meta` partiellement supporté
- Risque de bugs et de limitations documentées (issue #9430 ouverte depuis des années)

**Vitest** :
- ESM est le **mode natif et par défaut**
- `vi.mock()` fonctionne avec ESM sans artifice
- `import.meta` pleinement supporté (utile pour les tests in-source)
- Aucun flag expérimental nécessaire

> **Verdict** : Sur un projet ESM-first comme Veritas, Jest ajoute de la friction constante. Vitest est transparent.

### 3.3 TypeScript

**Jest** :
- Nécessite `ts-jest` (lent, compilation TS complète) ou `@swc/jest` (rapide mais config supplémentaire)
- Les alias de chemins (`@veritas/shared`) doivent être redéfinis dans `jest.config.js` (`moduleNameMapper`)
- Les types des tests globals nécessitent `@types/jest`

**Vitest** :
- **Zero-config** : TypeScript/JSX fonctionnent immédiatement via Vite
- Les **alias de chemins** sont hérités directement de `vite.config.ts` (`vite-tsconfig-paths` est déjà utilisé)
- Pas besoin de `@types/vitest` (types inclus)

> **Verdict** : Pour un monorepo avec des packages internes (`workspace:*`), Vitest évite la duplication de config des alias.

### 3.4 Configuration & DX

| Aspect | Jest | Vitest |
|--------|------|--------|
| Fichier de config | `jest.config.js` (séparé) | `vitest.config.ts` (étend `vite.config.ts`) |
| Aliases chemins | `moduleNameMapper` (redondant) | Hérités de Vite |
| Plugins | Babel plugins (séparés) | Plugins Vite réutilisés |
| Watch mode | Basé sur git diff | Basé sur module graph (HMR) |
| UI dashboard | ❌ | ✅ `@vitest/ui` |
| In-source testing | ❌ | ✅ (`import.meta.vitest`) |

> **Verdict** : Moins de configuration = moins de dette technique. Vitest suit le principe DRY.

### 3.5 Mocking & Snapshots

**Mocking** :
- API quasi-identique : `jest.fn()` → `vi.fn()`, `jest.mock()` → `vi.mock()`, `jest.spyOn()` → `vi.spyOn()`
- Vitest utilise **Tinyspy** (léger, intégré) vs Jest qui utilise son propre moteur
- Mock ESM : Vitest est **bien plus simple** (pas de `unstable_mockModule`)

**Snapshots** :
- Format compatible à 95%. Seules différences cosmétiques :
  - Header du snapshot : `// Vitest Snapshot v1` au lieu de `// Jest Snapshot v1`
  - `printBasicPrototype` défaut à `false` (sortie plus propre dans Vitest)
  - Séparateur `>` au lieu de `:` pour les hints
- Les snapshots Jest existants peuvent être réutilisés avec une option de config

> **Verdict** : Migration quasi-transparente. Pas de réécriture de tests nécessaire.

### 3.6 Monorepo & Workspaces

**Vitest 3+** a introduit la configuration **inline des workspaces** dans `vitest.config.ts` :

```ts
// vitest.config.ts racine
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'apps/frontend',
      'apps/backend',
      'packages/shared',
      'packages/etl',
    ]
  }
})
```

Avantages pour Veritas :
- Un seul fichier de config racine
- Chaque package peut avoir sa propre config qui hérite de la racine
- Turbo peut orchestrer `vitest run` parallèlement
- Le reporter `blob` permet du sharding CI avancé

**Jest** :
- Supporte les workspaces mais avec une configuration plus verbeuse
- Pas de mode inline natif avant des plugins externes

### 3.7 Browser Mode (tests navigateur réel)

**Vitest 4** propose un **Browser Mode stable** qui exécute les tests dans de vrais navigateurs (Chromium, Firefox, WebKit via Playwright) plutôt que jsdom.

C'est pertinent pour Veritas si on teste :
- Les composants React avec des API navigateur complexes
- Les OG images (Canvas, Satori)
- Le responsive / CSS layout

Jest est limité à jsdom (simulation incomplète du DOM).

### 3.8 Coverage

Les deux supportent V8 et Istanbul. Vitest intègre nativement `@vitest/coverage-v8` / `istanbul`. Aucun avantage significatif pour l'un ou l'autre.

---

## 4. Pérennité & Écosystème

### 4.1 Adoption & Communauté

| Métrique | Jest | Vitest | Tendance |
|----------|------|--------|----------|
| **Downloads npm / semaine** | ~30M | ~14M | Vitest x3.5 en 2 ans |
| **Stars GitHub** | ~45K | ~16K | Vitest croît vite |
| **Âge / Maturité** | 2014 (11 ans) | 2021 (5 ans) | Jest mature, Vitest adolescent |
| **Maintenance** | Meta/Facebook + communauté | Vite community (Anthony Fu, etc.) | Les deux actifs |

### 4.2 Alignement avec l'écosystème 2026

Vitest est devenu le **choix par défaut recommandé** par :
- Vite (évident)
- Vue / Nuxt 3
- Svelte / SvelteKit
- Astro
- SolidJS
- TanStack (Start, Router, Query)

Jest reste dominant sur :
- React Native (seul choix viable)
- Angular (Jest preset officiel)
- Codebases legacy CJS

> **Pour Veritas** : Le frontend utilise **TanStack Start + Vite**. L'écosystème entier pousse vers Vitest.

### 4.3 Maintenance & risque

**Jest** :
- ✅ Très mature, stable, documentation exhaustive
- ⚠️ Ralentissement des releases majeures (Jest 29 → 30 : 3 ans d'attente)
- ⚠️ Architecture CJS-first qui freine l'adoption ESM

**Vitest** :
- ✅ Releases fréquentes (v1 → v2 → v3 → v4 en 3 ans)
- ✅ Innovation constante (browser mode, type testing, bench)
- ⚠️ Moins mature sur les très grosses suites (10K+ tests) où Jest a plus d'optimisations
- ⚠️ Quelques breaking changes entre versions majeures (migration v2 → v3 documentée)

> **Verdict** : Pour un projet de la taille de Veritas (MVP, < 500 tests prévus), Vitest est plus que suffisamment mature. Le risque technique est faible.

---

## 5. Analyse spécifique pour Veritas

### 5.1 Avantages concrets de Vitest sur ce projet

1. **Réutilisation de la config Vite** : Le frontend a déjà `vite.config.ts` avec `vite-tsconfig-paths`, `@vitejs/plugin-react`, `tanstackStart()`. Vitest hérite de tout ça gratuitement.

2. **Alias monorepo** : `@veritas/shared`, `@veritas/backend` — résolus automatiquement via la config Vite existante. Avec Jest, il faudrait dupliquer `moduleNameMapper`.

3. **Backend Fastify** : Le backend est pur Node.js/TypeScript. Vitest fonctionne aussi bien sur du code serveur (pas besoin de jsdom). Les tests des services/repositories Fastify seront natifs ESM.

4. **ETL (streams Node.js)** : Les tests des utilitaires streams (`safe-zip-path`, `validateEtlUrl`) sont parfaits pour Vitest (Node environment, pas de DOM).

5. **Watch mode pendant le dev** : Modifier un schéma Zod dans `packages/shared` → Vitest relance **uniquement** les tests des packages qui l'importent. Jest relancerait toute la suite ou utiliserait une heuristique moins précise.

### 5.2 Ce que Jest ferait mieux (non pertinent pour Veritas)

- React Native : N/A
- Très grandes entreprises avec 10K+ tests et sharding finement tuné : N/A
- Legacy CJS : N/A (Veritas est ESM)

---

## 6. Plan de mise en œuvre recommandé

Vu que **Vitest 3.1.0 est déjà installé**, le plan est minimal :

### Phase 1 : Config racine (30 min)

Créer `vitest.config.ts` à la racine avec la config workspace :

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true, // pour compatibilité describe/it/expect sans import
    environment: 'node', // défaut, surchargé par package
    projects: [
      'apps/backend',
      'apps/frontend',
      'packages/shared',
      'packages/etl',
    ],
  },
})
```

### Phase 2 : Config par package (30 min)

Chaque package peut créer un `vitest.config.ts` léger qui étend la racine ou définit son propre environnement :

- `apps/frontend` : `environment: 'jsdom'` (pour les composants React)
- `apps/backend` : `environment: 'node'` (pour Fastify)
- `packages/etl` : `environment: 'node'` (streams, fichiers)
- `packages/shared` : `environment: 'node'` (schémas, types)

### Phase 3 : Premiers tests (à définir)

Priorité de test suggérée :
1. `packages/etl/src/safe-zip-path.ts` — logique critique sécurité
2. `packages/etl/src/validateEtlUrl.ts` — protection SSRF
3. `apps/backend/src/modules/compare/` — comparateur (logique métier)
4. `apps/backend/src/modules/deputies/` — pagination, cursor
5. `packages/shared/src/schemas/` — validation Zod

### Phase 4 : CI GitHub Actions (1h)

```yaml
- name: Test
  run: npx vitest run --coverage --reporter=github-actions
```

Le reporter `github-actions` affiche les erreurs directement dans l'interface PR (annotations inline).

---

## 7. Conclusion

| | Jest | Vitest |
|--|------|--------|
| **Pour Veritas** | Mauvais fit | Excellent fit |
| **Raisons** | CJS-first, config dupliquée, ESM expérimental, lenteur | Vite-native, ESM natif, zero-config TS, rapide, déjà installée |
| **Recommandation** | ❌ Ne pas adopter | ✅ Adopter immédiatement (déjà en place) |

Vitest n'est pas seulement "un peu mieux" que Jest pour ce projet — il est **architecturalement aligné** avec toutes les technologies déjà choisies (Vite, ESM, TypeScript, pnpm workspaces, TanStack). Choisir Jest impliquerait d'ajouter de la complexité, de la config redondante et des limitations ESM pour un bénéfice nul.

**Action proposée** : Valider cette analyse, puis implémenter la config Vitest workspace et écrire les premiers tests sur les modules critiques (ETL sécurité, comparateur API).

---

## 8. Sources

- [Vitest Comparisons — Official Docs](https://vitest.dev/guide/comparisons.html)
- [Vitest Features — Official Docs](https://vitest.dev/guide/features.html)
- [Jest ESM Support — Official Docs](https://jestjs.io/docs/ecmascript-modules)
- [DevTools Research — Vitest vs Jest 2026](https://devtoolswatch.com/en/vitest-vs-jest-2026)
- [PkgPulse — Vitest vs Jest Speed Benchmarks 2026](https://www.pkgpulse.com/guides/vitest-vs-jest-speed-benchmarks-2026)
- [PkgPulse — Vitest 3 vs Jest 30](https://www.pkgpulse.com/guides/vitest-3-vs-jest-30-2026)
- [PilotStack — Jest vs Vitest 2026](https://www.pilotstack.in/jest-vs-vitest)
- [Vitest GitHub — Comparisons](https://github.com/vitest-dev/vitest/blob/main/docs/guide/comparisons.md)
