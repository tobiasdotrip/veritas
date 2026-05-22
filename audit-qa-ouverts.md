# Audit QA — 5 éléments ouverts de Veritas

**Date** : 2026-05-22  
**Périmètre** : `docs/ETAT_PROJET.md` § « Toujours ouverts »  
**Méthodologie** : analyse statique + exécution des tests existants + inspection du code

---

## Résumé exécutif

| #   | Élément                  | Effort estimé | Priorité   | Risque si non traité                                                      |
| --- | ------------------------ | ------------- | ---------- | ------------------------------------------------------------------------- |
| 1   | Couverture tests         | 4–6 j         | 🔴 Élevée  | Bugs non détectés en prod, régressions silencieuses                       |
| 2   | Intégration/E2E          | 3–5 j         | 🟠 Moyenne | Flux cross-stack non vérifiés, UI cassée non détectée                     |
| 3   | Biais suggestions        | 2–3 j         | 🔴 Élevée  | Suggestions non pertinentes, frustration utilisateur                      |
| 4   | Filtre thématique croisé | 2–3 j         | 🟠 Moyenne | Résultats incohérents, combinatoire de filtres non validée                |
| 5   | Route OG non branchée    | 1–2 j         | 🟢 Basse   | Fonctionnalité inexistante (pas de régression), previews sociales cassées |

---

## 1. Couverture tests (~3.58%)

### État actuel

**Décompte réel** (exécution du 2026-05-22) :

| Workspace           | Fichiers      | Tests passés | Tests sautés |
| ------------------- | ------------- | ------------ | ------------ |
| `@veritas/shared`   | 1             | 4            | 0            |
| `@veritas/etl`      | 5             | 36           | 0            |
| `@veritas/backend`  | 5 (4 passent) | 42           | 2            |
| `@veritas/frontend` | 1             | 2            | 0            |
| **Total**           | **12**        | **84**       | **2**        |

Le chiffre ~3.58% correspond probablement à la couverture sur l'intégralité des 4 workspaces. Le coverage provider `v8` est configuré dans `vitest.config.ts` mais aucun rapport récent n'a été trouvé dans `coverage/`.

### Surfaces critiques non couvertes

#### Backend (risque 🔴)

| Module     | Routes                        | Tests                           | Risque                                                                  |
| ---------- | ----------------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| `search`   | 2 (suggestions + full search) | 1 smoke E2E                     | Requêtes PostgreSQL `to_tsvector`/`to_tsquery` non testées unitairement |
| `scrutins` | 3 (liste/détail/votes)        | 0                               | Pagination cursor, filtres combinés, tri par pertinence non testés      |
| `deputies` | 4 (liste/profil/votes/stats)  | 0                               | Résolution slug/ID, stats agrégées, pagination votes non testées        |
| `compare`  | 1 (compare)                   | **8 tests unitaires** (service) | ✅ Seul module backend bien couvert                                     |
| `groups`   | routes présentes              | 0                               | Endpoints non testés du tout                                            |

**Constats** :

- Le module `search` a une logique de sanitization `toPrefixTsQuery()` pour suggestions et validation `rethrowTextSearchValidationError` — aucun test unitaire pour ces fonctions critiques.
- L'intégration test (backend) ne teste que `/health` et `/api/v1/search/suggestions?q=martin&limit=5`. Aucune assertion sur le contenu des résultats.
- Les services `scrutins` et `deputies` sont enrobés de cache Redis : le comportement de cache hit/miss/stale n'est jamais testé.

#### Frontend (risque 🟠)

| Composant/Hook              | Tests | Risque                                                                                      |
| --------------------------- | ----- | ------------------------------------------------------------------------------------------- |
| `useSearch`                 | 0     | Requêtes déclenchées, clés TanStack Query, `enabled` condition                              |
| `useThemeScrutins`          | 0     | Appel API `/scrutins?theme=X`, fusion résultats côté client                                 |
| `useComparison`             | 0     | Calcul `periodToFrom`, composition URL params                                               |
| `useDeputeVotes`            | 0     | Pagination infinite query                                                                   |
| `ComparatorStore` (Zustand) | 0     | Logique persist, max 4 comparés, retrait référence                                          |
| `SearchCombobox`            | 0     | Comportement input debounce, sélection, accessibilité                                       |
| `routes/recherche.tsx`      | 0     | Fusion recherche + thématique, filtres type, état loading/empty/error                       |
| `routes/comparateur.tsx`    | 0     | Tous les états (pas de référence, loading, error, pas de votes communs, concordance totale) |

#### ETL (risque 🟢)

Bonne couverture : config URLs (11 tests), zip slip (12 tests), zip entry types (6 tests), parseurs (4 tests).  
**Manque** : tests d'intégration ETL complet (download → parse → load PostgreSQL), mais ceux-ci sont lourds et moins prioritaires.

#### Shared (risque 🟢)

4 tests sur les schémas Zod. Acceptable pour l'instant.

### Plan d'augmentation

| Phase                     | Contenu                                                                                                    | Effort | Priorité |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ | -------- |
| **Phase 1** (immédiat)    | Tests unitaires `toPrefixTsQuery()` + `withTextSearchErrorHandling()` + `ScrutinService` + `DeputyService` | 2 j    | 🔴       |
| **Phase 2** (court terme) | Tests hooks React (`useSearch`, `useComparison`, `useThemeScrutins`) + Zustand store                       | 1.5 j  | 🟠       |
| **Phase 3** (court terme) | Tests composants frontend (états loading/empty/error sur les pages critiques)                              | 1 j    | 🟠       |
| **Phase 4** (moyen terme) | Tests intégration backend sur jeux de données seed (scrutins, deputies, votes)                             | 1.5 j  | 🟡       |

**Cible de couverture recommandée** : 60-65% global, avec ≥80% sur `search`, `scrutins`, `compare`, `deputies` (modules métier).

---

## 2. Intégration/E2E — Playwright

### État actuel

```
e2e/
├── package.json          # @playwright/test ^1.52.0
├── playwright.config.ts  # 2 projets : api-smoke, frontend-smoke
└── smoke.spec.ts         # 3 tests : health, suggestions, homepage
```

**CI** : lancé après `pnpm test`, backend démarré avec `NODE_ENV=test`, attente 30s max sur `/health`, puis `pnpm test:e2e`.  
**Limite** : `frontend-smoke` est `test.skip` sauf si `E2E_FRONTEND_BASE_URL` est défini.

### Plan d'extension E2E

| Test E2E                    | Flux couvert                                                            | Effort | Priorité |
| --------------------------- | ----------------------------------------------------------------------- | ------ | -------- |
| **Recherche complète**      | Saisir "macron" → suggestions → sélection → fiche député                | 0.5 j  | 🔴       |
| **Recherche scrutin**       | Saisir "réforme" → résultats mixtes → navigation scrutin                | 0.5 j  | 🔴       |
| **Comparateur complet**     | Ajouter 2 députés → sélectionner période → vérifier score → divergences | 0.5 j  | 🟠       |
| **Filtre thématique**       | Page recherche → sélectionner thème → vérifier scrutins filtrés         | 0.5 j  | 🟠       |
| **Pagination votes député** | Fiche député → scroll → « Charger plus » → nouvelles données            | 0.5 j  | 🟠       |
| **Navigation mobile**       | Viewport 375px → navigation hamburger → toutes les pages                | 0.5 j  | 🟡       |
| **Erreurs réseau**          | Simuler backend down → vérifier états d'erreur frontend                 | 0.5 j  | 🟡       |

**Prérequis bloquants** :

- Base de données seed cohérente en CI (les données E2E doivent être déterministes).
- `E2E_FRONTEND_BASE_URL` doit pointer vers le frontend buildé (pas `vite dev`).

**Recommandation** : Ajouter un script `pnpm e2e:ci` qui :

1. Lance PostgreSQL + Redis (docker-compose)
2. Migre + seed la BDD
3. Build le frontend
4. Lance backend + frontend
5. Exécute Playwright

**Estimation totale** : 3–5 jours, dépendant de la complexité du seed de données.

---

## 3. Biais suggestions recherche

### Analyse du code

Le module `apps/backend/src/modules/search/routes.ts` contient deux endpoints :

1. **`GET /search/suggestions?q=X&limit=Y`** — utilise `to_tsquery('french', q:*)` (prefix matching)
2. **`GET /search?q=X&limit=Y`** — utilise `plainto_tsquery('french', q)` (pas de prefix matching)

**Problèmes identifiés** :

| #   | Problème                                                                                                                                                                    | Impact                           | Sévérité |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------- |
| B1  | `toPrefixTsQuery()` strip tous les caractères non alphanumériques → "Jean-Michel" devient "JeanMichel:\*" → pas de match sur "jean-michel" dans le ts_vector                | Faux négatifs pour noms composés | 🔴       |
| B2  | Les suggestions mélangent députés et scrutins, triés par `ts_rank` global → un scrutin avec un titre long contenant le terme peut dominer un député dont c'est le nom exact | Pertinence dégradée              | 🟠       |
| B3  | `ts_rank` ne tient pas compte de la position du terme → "Martin" en milieu de titre scrutin ranké comme en début                                                            | Scrutins parasites en tête       | 🟡       |
| B4  | Pas de normalisation Unicode (accents, ligatures) en entrée → "François" ne matche pas "francois" tapé sans cédille                                                         | UX dégradée                      | 🟠       |
| B5  | `limit` appliqué par type PUIS fusionné → si un type a plus de résultats pertinents, il écrase l'autre                                                                      | Déséquilibre députés/scrutins    | 🟡       |
| B6  | Pas de préférence pour les correspondances exactes → "Macron" devrait ranker Emmanuel Macron avant un scrutin qui mentionne le nom                                          | Mauvaise première suggestion     | 🔴       |

### Scénarios de test recommandés

```
Suite: Suggestions search bias
├── Test: "macron" → 1er résultat = député Emmanuel Macron
├── Test: "lepen" → 1er résultat = député Marine Le Pen
├── Test: "jean-michel" → match le député avec tiret dans le nom
├── Test: "francois" → match "François" (sans cédille tapé)
├── Test: "retraite" → mix députés/scutins pertinent (scrutins probables en tête)
├── Test: "xyz123" → 0 résultat, pas d'erreur
├── Test: chaîne 100+ caractères → pas de crash PostgreSQL
├── Test: injection SQL via "'; DROP TABLE--" → pas d'erreur
├── Test: limit=1 → max 1 résultat
├── Test: limit=20 → max 20 résultats
├── Test: q="" → 400 (validé par Zod min(1))
├── Test: limit=0 → 400 (validé par Zod min(1))
├── Test: limit=21 → 400 (validé par Zod max(20))
├── Test: résultats déterministes (même q → même ordre)
└── Test: temps de réponse < 200ms avec BDD seed 500+ députés
```

### Jeux de données nécessaires

| Donnée                                                                          | Pourquoi                              |
| ------------------------------------------------------------------------------- | ------------------------------------- |
| Député "Emmanuel Macron" (ou nom très similaire) + scrutin mentionnant "Macron" | Tester priorité nom propre vs mention |
| Député "Jean-Michel Dupont" + scrutin "Jean-Michel"                             | Tester tirets                         |
| Député "François Martin"                                                        | Tester accents/Unicode                |
| 10+ scrutins avec le mot "réforme"                                              | Tester ranking pertinence             |
| Scrutins avec titres très longs (>500 car.)                                     | Tester edge cases PostgreSQL          |

**Estimation** : 2–3 jours (1 j données de test + 1 j scénarios + 0.5 j analyse biais)

---

## 4. Filtre thématique croisé

### Analyse du code

Deux mécanismes cohabitent dans `routes/recherche.tsx` :

1. **Recherche full-text** (`/search?q=X`) → retourne `{ deputies, scrutins }`
2. **Filtre thématique** (`/scrutins?theme=slug&sort=date_desc`) → retourne des scrutins

Côté frontend, les résultats sont fusionnés : `searchScrutins + themedScrutins` dédoublonnés par ID.

**Problèmes identifiés** :

| #   | Problème                                                                                                                        | Impact                                            | Sévérité |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------- |
| T1  | Fusion déséquilibrée : si `type=depute`, `themedScrutins` est ignoré (`type !== 'depute'` dans la condition)                    | Filtre thématique silencieusement ignoré          | 🟠       |
| T2  | Le filtre thématique utilise `/scrutins` (pas `/search`) → pas de ranking texte, juste `date_desc`/`date_asc`                   | Résultats thématiques non ordonnés par pertinence | 🟡       |
| T3  | Pas de limite côté backend pour le filtre thématique → si 500 scrutins tagués "écologie", tous sont chargés                     | Performances dégradées                            | 🟡       |
| T4  | Les scrutins thématiques n'ont pas les mêmes champs que les scrutins de recherche (`SearchResultScrutin` utilisé pour les deux) | Cohérence OK actuellement, mais fragile           | 🟡       |
| T5  | Pas de combinaison `theme` + `q` sur le même endpoint backend → deux appels API séparés                                         | Latence doublée, ordre incohérent                 | 🟠       |
| T6  | Aucune indication visuelle que les résultats sont filtrés par thème (juste un `<p>` discret)                                    | UX confuse                                        | 🟡       |

### Cas de test

```
Suite: Filtre thématique croisé
├── Test: rechercher "réforme" → basculer type=scrutin → vérifier que seuls des scrutins apparaissent
├── Test: thème "écologie" sans recherche texte → vérifier que des scrutins apparaissent
├── Test: thème "écologie" + recherche "énergie" → vérifier intersection (scrutins tagués écologie contenant énergie)
├── Test: changer de type après filtrage thématique → vérifier cohérence
├── Test: thème invalide "theme_inexistant" → 0 résultat, pas d'erreur
├── Test: thème + type=depute → 0 scrutins affichés (comportement actuel, à documenter)
├── Test: paramètres URL préservés (q, type, theme) après navigation retour
├── Test: rafraîchir la page → paramètres URL restaurés → mêmes résultats
└── Test: copier URL avec tous les filtres → coller nouvel onglet → mêmes résultats
```

### Edge cases

| Edge case                                               | Comportement attendu                                   | Risque |
| ------------------------------------------------------- | ------------------------------------------------------ | ------ |
| Thème avec apostrophe dans le slug (`l-etat-d-urgence`) | Encodage URL correct, pas de double-encoding           | 🟡     |
| Thème avec 0 scrutins associés                          | Empty state, pas d'erreur                              | 🟢     |
| 2 thèmes simultanés ?                                   | Non supporté actuellement (un seul `theme` dans l'URL) | 🟢     |
| Thème + recherche vide (`q=""`)                         | Les scrutins thématiques doivent s'afficher            | 🟠     |
| Changement rapide de thème → race condition             | Dernière requête gagne (TanStack Query gère)           | 🟢     |
| Thème avec encoding spécial (`%20`, `+`)                | Décodage correct côté backend                          | 🟡     |

**Estimation** : 2–3 jours (1 j cas de test + 1 j edge cases + 0.5 j validation cross-browser)

---

## 5. Route OG non branchée

### État actuel

Trois fichiers stubs dans `apps/frontend/src/routes/api/og/` :

| Fichier           | Contenu                                         | Statut                  |
| ----------------- | ----------------------------------------------- | ----------------------- |
| `depute.tsx`      | Satori 1200×630, affiche `slug` + stats vides   | Stub — `// @ts-nocheck` |
| `scrutin.tsx`     | Satori 1200×630, affiche `id` + compteurs vides | Stub — `// @ts-nocheck` |
| `comparateur.tsx` | Satori 1200×630, affiche score de concordance   | Stub — `// @ts-nocheck` |

**Problèmes** :

1. **Non branché au route tree** : `createAPIFileRoute` n'est pas exporté par `@tanstack/react-start 1.168.6` (la version actuelle). Les fichiers exportent `APIRoute` mais TanStack Router génère un warning : `does not export a Route. This file will not be included in the route tree`.
2. **Données en dur** : Aucun fetch vers le backend. Le stub `depute.tsx` utilise juste le paramètre `slug` comme texte, pas de vraies données.
3. **Pas de fonts** : `fonts: []` — le rendu utilise la police système fallback, qualité visuelle aléatoire.
4. **Pas de tests** : Aucun test de snapshot visuel ou de rendu Satori.

### Stratégie de test

| Niveau       | Approche                                                                                                                            | Effort |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **Unitaire** | Tester le rendu Satori avec des props mockées → vérifier que le SVG contient les bons éléments (headless, pas besoin de navigateur) | 0.5 j  |
| **Snapshot** | Générer SVG → sauvegarder snapshot → comparer en CI. Satori est déterministe pour des inputs identiques.                            | 0.5 j  |
| **E2E**      | GET `/api/og/depute?slug=X` → vérifier Content-Type `image/svg+xml` → vérifier dimensions → vérifier headers Cache-Control          | 0.5 j  |
| **Visuel**   | Playwright screenshot comparison sur le SVG rendu dans un `<img>` tag                                                               | 0.5 j  |

### Points d'attention techniques

| Risque           | Détail                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Satori + SSR** | Satori utilise `yoga-layout` (WASM). En SSR TanStack Start, le chargement WASM peut être problématique. À tester avec le build Vite. |
| **Fonts**        | Il faudra embarquer une police (ex: Inter 400/700) en base64 dans le bundle. Taille ~100 Ko compressée.                              |
| **Cache**        | Les headers `Cache-Control` sont déjà configurés (24h + stale-while-revalidate 7j) — à valider.                                      |
| **Dimensions**   | 1200×630 est l'Open Graph standard — vérifier que le ratio est exact.                                                                |
| **Performance**  | Le rendu Satori prend ~50-100ms. Pour des OG images servies à la volée, c'est acceptable.                                            |

### Scénarios de test

```
Suite: Route OG
├── depute.tsx
│   ├── GET /api/og/depute?slug=martin → 200, Content-Type image/svg+xml
│   ├── GET /api/og/depute (sans slug) → fallback "depute" (comportement actuel du stub)
│   ├── Snapshot: vérifier présence nom député, stats, photo placeholder
│   ├── Dimensions: 1200×630 exactement
│   └── Headers: Cache-Control, pas de Set-Cookie
├── scrutin.tsx
│   ├── GET /api/og/scrutin?id=123 → 200, Content-Type image/svg+xml
│   ├── Snapshot: vérifier n° scrutin, compteurs pour/contre/abstentions
│   └── Layout: pas de débordement avec titre long
├── comparateur.tsx
│   ├── GET /api/og/comparateur?score=73.5 → affiche "73.5%"
│   ├── GET /api/og/comparateur?score=0 → affiche "0%"
│   ├── GET /api/og/comparateur (sans score) → fallback "0"
│   └── Edge case: score > 100 ou négatif → comportement défensif
└── Intégration
    ├── OG image intégrée dans <meta property="og:image"> sur page député
    └── OG image intégrée dans <meta property="og:image"> sur page comparateur
```

**Estimation** : 1–2 jours (0.5 j mise en place infra de test Satori + 0.5 j snapshots + 0.5 j E2E)

---

## Synthèse des risques

| Risque                                     | Élément(s) concerné(s) | Impact                                           | Probabilité                           |
| ------------------------------------------ | ---------------------- | ------------------------------------------------ | ------------------------------------- |
| Régression sur la recherche (cœur produit) | 1, 3, 4                | Fort — fonctionnalité phare                      | Moyenne (changements fréquents)       |
| UI cassée non détectée avant déploiement   | 2                      | Fort — perte de confiance utilisateur            | Élevée (pas de tests E2E cross-stack) |
| Previews sociales inexistantes             | 5                      | Faible — feature non livrée                      | Certaine (non branché)                |
| Dette technique test qui s'accumule        | 1                      | Moyen — ralentissement des futurs développements | Certaine                              |
| Faux positifs/négatifs recherche           | 3                      | Fort — frustration utilisateur                   | Élevée (biais documentés)             |
| Combinatoire filtres non maîtrisée         | 4                      | Moyen — bugs subtils en production               | Moyenne                               |

---

## Recommandations globales

### Ordre de traitement suggéré

1. **Phase 1** (semaine 1) : Tests unitaires backend search (`toPrefixTsQuery`, service search) + biais suggestions
2. **Phase 2** (semaine 2) : Tests unitaires backend scrutins/deputies + filtre thématique croisé
3. **Phase 3** (semaine 3) : E2E flux critiques (recherche, comparateur) + hooks frontend
4. **Phase 4** (semaine 4) : Route OG (activation + tests) + composants frontend

### Infrastructure

- Ajouter un seed de données déterministe pour les tests (`pnpm db:seed:test`)
- Configurer `E2E_FRONTEND_BASE_URL` dans le CI pour exécuter les tests frontend
- Ajouter une target `pnpm coverage` qui génère le rapport HTML et l'affiche dans CI
- Configurer un seuil minimum de coverage dans `vitest.config.ts` (ex: 50% statements sur backend)

### Outils complémentaires

| Outil                           | Usage                                    | Priorité |
| ------------------------------- | ---------------------------------------- | -------- |
| `@vitest/coverage-v8`           | Déjà configuré, activer le rapport CI    | 🔴       |
| `@faker-js/faker`               | Données de test réalistes pour les seeds | 🟠       |
| Playwright `toHaveScreenshot()` | Snapshots visuels OG + comparateur       | 🟠       |
| `msw`                           | Mock API pour les tests hooks React      | 🟠       |
| `testcontainers` (PostgreSQL)   | Tests intégration backend isolés         | 🟡       |
