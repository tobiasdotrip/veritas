# Synthèse croisée — 5 éléments ouverts Veritas

**Date** : 2026-05-22  
**Auditeurs** : Security Engineer, QA Engineer, Backend Developer  
**Référence** : `docs/ETAT_PROJET.md` § « Toujours ouverts »

---

## 1. Tableau de convergence

| #     | Élément                   | Sécurité                                                               | QA                                                       | Backend                                             | Consensus                          |
| ----- | ------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------- | ---------------------------------- |
| **3** | Biais/injection recherche | 🔴 HIGH — bug `toPrefixTsQuery` + risque injection                     | 🔴 Élevée — faux négatifs, frustrations UX               | 🔴 Scores incomparables inter-types, accents cassés | **🔴 Unanime P0**                  |
| **5** | Route OG non branchée     | 🔴 HIGH — bombe à retardement (activation silencieuse TanStack ≥1.170) | 🟢 Basse — feature non livrée, pas de régression         | Facile — endpoint backend recommandé                | **🟠 P0 sécurité, P3 fonctionnel** |
| **1** | Couverture tests          | 🔴 HIGH — 75% backend non testé, régressions silencieuses              | 🔴 Élevée — 3.58% global, 12 fichiers de test            | Moyen — 1850 lignes non couvertes sur 2450          | **🔴 Unanime P0**                  |
| **2** | Intégration/E2E           | 🟠 MEDIUM — divergence API, CORS/Cache non vérifiés                    | 🟠 Moyenne — UI cassée non détectée, smoke test existant | Moyen — fixtures + CI manquants                     | **🟠 Unanime P1**                  |
| **4** | Filtre thématique         | 🟡 LOW — pas d'injection SQL (Drizzle paramètre), validation laxiste   | 🟠 Moyenne — combinatoire filtres non validée            | Facile — module themes proposé                      | **🟡 P2, quick win**               |

---

## 2. Analyse détaillée par élément

### 2.1 Biais et injection recherche — 🔴 P0 (bloquant)

**Problème racine** : `toPrefixTsQuery()` dans `apps/backend/src/modules/search/routes.ts`

```typescript
function toPrefixTsQuery(q: string): string {
  const safeQ = q.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  return safeQ ? `${safeQ}:*` : ""; // ← BUG : seul le dernier mot est préfixé
}
```

#### Les 3 auditeurs s'accordent sur 5 problèmes :

| #   | Problème                                                                                                      | Sécurité                    | QA                             | Backend                            |
| --- | ------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------ | ---------------------------------- |
| B1  | Préfixe dernier mot uniquement → "jean dup" ne trouve pas "Jean Dupont"                                       | ✅ Injection partielle      | ✅ Faux négatifs UX            | ✅ Bug fonctionnel                 |
| B2  | Scores `ts_rank` incomparables entre députés (textes courts) et scrutins (textes longs)                       | ✅ Biais exploitable        | ✅ Suggestions non pertinentes | ✅ Problème #1 backend             |
| B3  | Regex supprime accents → "ecolo" ne matche pas "écologie"                                                     | ✅ Contournement validation | ✅ Normalisation absente       | ✅ `unaccent` non utilisé          |
| B4  | Double chemin `to_tsquery` (suggestions) vs `plainto_tsquery` (recherche) — seul chemin avec nettoyage manuel | ✅ Surface d'attaque isolée | ✅ Comportement divergent      | ✅ Uniformisation nécessaire       |
| B5  | Pas de fallback trigram pour ≤3 caractères ou typos                                                           | -                           | ✅ Suggestions pauvres         | ✅ `pg_trgm` installé, non utilisé |

#### Plan de correction (convergence des 3 audits)

| Étape | Action                                                                                      | Effort | Source             |
| ----- | ------------------------------------------------------------------------------------------- | ------ | ------------------ |
| 1     | Corriger `toPrefixTsQuery` : `safeQ.split(/\s+/).map(w => w + ':*').join(' & ')`            | 30 min | Sécurité + Backend |
| 2     | Ajouter `unaccent()` côté PostgreSQL                                                        | 15 min | Backend            |
| 3     | Normaliser `ts_rank` entre types : diviser par longueur document + pondération configurable | 1h     | Backend + QA       |
| 4     | Interleave députés/scrutins dans les résultats fusionnés                                    | 30 min | Backend            |
| 5     | Fallback `pg_trgm` pour requêtes ≤ 3 caractères                                             | 1h     | Backend            |
| 6     | Tests unitaires `toPrefixTsQuery` (15+ cas)                                                 | 1h     | Sécurité + QA      |
| 7     | Tests d'intégration suggestions (scénarios QA)                                              | 2h     | QA                 |

**Total élément 3** : ~6h

---

### 2.2 Route OG non branchée — 🟠 Bombe à retardement

**Problème racine** : 3 fichiers stubs dans `apps/frontend/src/routes/api/og/` non branchés au route tree, avec inputs non validés et `@ts-nocheck`.

#### Divergence entre auditeurs

| Auditeur     | Position                        | Raison                                                                         |
| ------------ | ------------------------------- | ------------------------------------------------------------------------------ |
| **Sécurité** | 🔴 P0 — supprimer immédiatement | Activation silencieuse si TanStack Start ≥1.170, inputs non validés, cache 24h |
| **QA**       | 🟢 Basse — feature non livrée   | Pas de régression possible puisque non activé                                  |
| **Backend**  | Facile — endpoint backend       | Propose option B : implémenter côté Fastify (indépendant de TanStack)          |

#### Analyse de la divergence

Le security-engineer voit un **risque latent** (bombe à retardement) là où le QA-engineer voit une **feature non implémentée**. Les deux ont raison : le risque est réel si la version TanStack Start évolue, mais le danger immédiat est nul puisque `createAPIFileRoute` n'est pas exporté en 1.168.

#### Plan recommandé (synthèse des 3)

| Étape | Action                                                                           | Effort | Urgence            |
| ----- | -------------------------------------------------------------------------------- | ------ | ------------------ |
| 1     | Déplacer `apps/frontend/src/routes/api/og/*.tsx` → `apps/frontend/src/stubs/og/` | 5 min  | **Immédiat**       |
| 2     | Ajouter commentaire `// IGNORE: security review required before activation`      | 2 min  | **Immédiat**       |
| 3     | Implémenter l'option B du backend : module `og/` Fastify (3 endpoints)           | 5h     | Sprint suivant     |
| 4     | Validation Zod des inputs (`score`, `slug`, `id`) avant toute activation         | 30 min | Avant activation   |
| 5     | Tests snapshots Satori + E2E Playwright                                          | 2h     | Avant mise en prod |

**Total élément 5** : ~7h45 (dont 5 min pour le correctif immédiat)

---

### 2.3 Couverture de tests — 🔴 P0 (chantier continu)

**Problème racine** : 75% du backend non testé (1850/2450 lignes), 3.58% de couverture globale.

#### Cartographie des zones mortes (convergence sécurité + QA + backend)

| Module                             | Lignes | Testé | Risque si régression                | Complexité test  |
| ---------------------------------- | ------ | ----- | ----------------------------------- | ---------------- |
| `search/routes.ts`                 | 261    | ❌    | 🔴 Cœur produit, injection possible | Moyen (2h)       |
| `deputies/repository.ts`           | 352    | ❌    | 🔴 Stats erronées affichées         | Moyen (3h)       |
| `scrutins/repository.ts`           | 237    | ❌    | 🔴 Pagination + filtre cassés       | Moyen (2h)       |
| `deputies/routes.ts`               | 260    | ❌    | 🟠 4 endpoints REST                 | Moyen (2h)       |
| `scrutins/routes.ts`               | 175    | ❌    | 🟠 3 endpoints REST                 | Moyen (1h30)     |
| `groups/routes.ts`                 | 206    | ❌    | 🟠 SQL raw + stats                  | Difficile (4h)   |
| `compare/routes.ts`                | 127    | ❌    | 🟠 Résolution slug                  | Facile (1h)      |
| `compare/repository.ts`            | 97     | ❌    | 🟡 CTE + jointures                  | Moyen (1h30)     |
| `common/db-errors.ts`              | 54     | ❌    | 🟢 Fonctions pures                  | Trivial (30 min) |
| `common/redis-rate-limit-store.ts` | 108    | ❌    | 🟡 Infra Redis                      | Moyen (1h30)     |
| Frontend hooks                     | ~200   | 1/8   | 🟠 `useSearch`, `useComparison`     | Moyen (3h)       |
| Frontend pages                     | ~400   | 0/6   | 🟠 États loading/empty/error        | Moyen (3h)       |

#### Stratégie de montée en couverture

| Phase  | Modules                                                                                  | Tests estimés | Effort | Couverture cible |
| ------ | ---------------------------------------------------------------------------------------- | ------------- | ------ | ---------------- |
| **P0** | `search/routes.ts`, `deputies/repository.ts`, `scrutins/repository.ts`                   | ~50           | 7h     | Backend 40%      |
| **P1** | `deputies/routes.ts`, `scrutins/routes.ts`, `compare/routes.ts`, `compare/repository.ts` | ~40           | 6h     | Backend 55%      |
| **P2** | `groups/routes.ts`, `common/db-errors.ts`, `redis-rate-limit-store.ts`                   | ~25           | 6h     | Backend 70%      |
| **P3** | Frontend hooks + pages + composants                                                      | ~35           | 6h     | Frontend 50%     |

**Total élément 1** : ~25h sur 4 sprints

---

### 2.4 Intégration/E2E — 🟠 P1

**Problème racine** : infrastructure de test d'intégration existante (`test-utils/`) mais inutilisée faute de fixtures et de `DATABASE_URL` en CI.

#### Points d'accord entre auditeurs

| Besoin                            | Sécurité           | QA                           | Backend                              |
| --------------------------------- | ------------------ | ---------------------------- | ------------------------------------ |
| Fixtures de seed déterministes    | ✅                 | ✅ Jeu de données nécessaire | ✅ `test-utils/fixtures.ts` à créer  |
| `DATABASE_URL` en CI              | -                  | ✅                           | ✅ Service PostgreSQL GitHub Actions |
| Tests intégration par module      | ✅ Priorité search | ✅ 5 fichiers recommandés    | ✅ 5 modules concernés               |
| Tests E2E Playwright              | ✅ Smoke test      | ✅ 7 scénarios               | -                                    |
| Contrat API Zod vs types frontend | ✅                 | -                            | -                                    |

#### Plan E2E (convergence QA + backend)

| Scénario E2E                           | Flux                                                       | Effort |
| -------------------------------------- | ---------------------------------------------------------- | ------ |
| Recherche → suggestions → fiche député | `/recherche` → taper → sélectionner → naviguer             | 0.5 j  |
| Recherche scrutin                      | `/recherche` → résultats mixtes → ouvrir scrutin           | 0.5 j  |
| Comparateur complet                    | Ajouter 2 députés → période → vérifier score → divergences | 0.5 j  |
| Filtre thématique                      | Page recherche → thème → scrutins filtrés                  | 0.5 j  |
| Pagination votes                       | Fiche député → « Charger plus » → nouvelles données        | 0.5 j  |
| Mobile responsive                      | Viewport 375px → navigation → contenu                      | 0.5 j  |
| États d'erreur                         | Backend down → ErrorFallback affiché                       | 0.5 j  |

#### Plan intégration backend

| Fichier                        | Scénarios                                                      | Effort |
| ------------------------------ | -------------------------------------------------------------- | ------ |
| `search.integration.test.ts`   | 5 scénarios (valide, vide, max results, injection, mix types)  | 2h     |
| `compare.integration.test.ts`  | 6 scénarios (2/3/5 députés, période, votes identiques/opposés) | 1h30   |
| `scrutins.integration.test.ts` | 4 scénarios (pagination, curseur, thème, détail)               | 1h30   |
| `deputies.integration.test.ts` | 4 scénarios (slug, ID, 404, votes paginés)                     | 1h30   |
| `groups.integration.test.ts`   | 2 scénarios (liste, détail + stats)                            | 1h     |

**Prérequis** : fixtures de seed (2h), service PG en CI (30 min)

**Total élément 2** : ~11h

---

### 2.5 Filtre thématique croisé — 🟡 P2 (quick win)

**Problème racine** : paramètre `theme` non validé côté backend, fusion frontend fragile entre `/search` et `/scrutins`.

#### Points d'accord

| Action                              | Sécurité                   | QA             | Backend                         |
| ----------------------------------- | -------------------------- | -------------- | ------------------------------- |
| Validation Zod `theme`              | ✅ `z.string().regex(...)` | ✅             | ✅                              |
| Module `GET /themes`                | -                          | -              | ✅ Nouveau module               |
| `GET /search?theme=X`               | -                          | ✅ Cas de test | ✅ Modification route existante |
| Frontend : validation search params | ✅ `validateSearch`        | ✅ Cas de test | -                               |

#### Problèmes spécifiques identifiés par QA (non vus par les autres)

| #   | Problème                                                            | Impact                                     |
| --- | ------------------------------------------------------------------- | ------------------------------------------ |
| T1  | Si `type=depute`, `themedScrutins` est ignoré silencieusement       | Filtre thématique inopérant en vue députés |
| T2  | Fusion de `/search?q=` + `/scrutins?theme=` en 2 appels API séparés | Latence doublée                            |
| T3  | Pas de limite sur `/scrutins?theme=` → chargement complet           | Performance                                |
| T6  | Aucune indication visuelle du filtre actif                          | UX confuse                                 |

#### Plan (convergence des 3 audits)

| Étape | Action                                                                    | Effort |
| ----- | ------------------------------------------------------------------------- | ------ |
| 1     | Validation Zod `theme` : `.regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/).max(50)` | 15 min |
| 2     | Nouveau module `GET /api/v1/themes` (liste + compteurs)                   | 1h     |
| 3     | Ajout `theme` optionnel à `GET /api/v1/search` et `/search/suggestions`   | 30 min |
| 4     | Validation frontend `theme` dans `recherche.tsx`                          | 10 min |
| 5     | Tests intégration themes + search filtré                                  | 1h30   |

**Total élément 4** : ~3h25

---

## 3. Plan d'action global

### Semaine 1 — Blocages et quick wins (~4h)

| Ordre | Action                                             | Élément | Effort | Impact                               |
| ----- | -------------------------------------------------- | ------- | ------ | ------------------------------------ |
| 1     | Déplacer stubs OG hors `src/routes/`               | 5       | 5 min  | 🔴 Neutralise bombe à retardement    |
| 2     | Corriger `toPrefixTsQuery` (préfixe tous les mots) | 3       | 30 min | 🔴 Corrige bug fonctionnel recherche |
| 3     | Ajouter `unaccent()` dans les requêtes PG          | 3       | 15 min | 🔴 Corrige recherche sans accents    |
| 4     | Tests unitaires `toPrefixTsQuery` (15+ cas)        | 3       | 1h     | 🔴 Garantit non-régression           |
| 5     | Validation Zod `theme` backend                     | 4       | 15 min | 🟡 Quick win sécurité                |
| 6     | Validation Zod `theme` frontend                    | 4       | 10 min | 🟡 Quick win sécurité                |
| 7     | Interleave députés/scrutins dans les résultats     | 3       | 30 min | 🟠 Améliore pertinence               |
| 8     | Normalisation `ts_rank` inter-types                | 3       | 1h     | 🟠 Scores comparables                |

### Semaine 2 — Intégration et tests critiques (~10h)

| Ordre | Action                                                    | Élément | Effort |
| ----- | --------------------------------------------------------- | ------- | ------ |
| 9     | Fixtures de seed déterministes (`test-utils/fixtures.ts`) | 2       | 2h     |
| 10    | Service PostgreSQL dans CI (`.github/workflows/ci.yml`)   | 2       | 30 min |
| 11    | Tests intégration `search.integration.test.ts`            | 2       | 2h     |
| 12    | Tests intégration `compare.integration.test.ts`           | 2       | 1h30   |
| 13    | Tests intégration `scrutins.integration.test.ts`          | 2       | 1h30   |
| 14    | Tests `deputies/repository.ts`                            | 1       | 3h     |

### Semaine 3 — Couverture backend (~8h)

| Ordre | Action                                              | Élément | Effort |
| ----- | --------------------------------------------------- | ------- | ------ |
| 15    | Tests `scrutins/repository.ts`                      | 1       | 2h     |
| 16    | Tests `deputies/routes.ts`                          | 1       | 2h     |
| 17    | Tests `scrutins/routes.ts`                          | 1       | 1h30   |
| 18    | Tests `compare/routes.ts` + `compare/repository.ts` | 1       | 2h30   |

### Semaine 4 — Thèmes, E2E, frontend (~12h)

| Ordre | Action                                                                  | Élément | Effort |
| ----- | ----------------------------------------------------------------------- | ------- | ------ |
| 19    | Module `GET /api/v1/themes`                                             | 4       | 1h     |
| 20    | `GET /api/v1/search?theme=X`                                            | 4       | 30 min |
| 21    | Tests intégration themes + search filtré                                | 4       | 1h30   |
| 22    | E2E Playwright : recherche + comparateur (3 scénarios)                  | 2       | 1h30   |
| 23    | E2E Playwright : filtre thématique + pagination (2 scénarios)           | 2       | 1h     |
| 24    | E2E Playwright : mobile + erreurs (2 scénarios)                         | 2       | 1h     |
| 25    | Tests hooks frontend (`useSearch`, `useComparison`, `useThemeScrutins`) | 1       | 3h     |
| 26    | Tests composants frontend (états loading/empty/error)                   | 1       | 3h     |

### Sprint 5 — OG et finitions (~9h)

| Ordre | Action                                         | Élément | Effort |
| ----- | ---------------------------------------------- | ------- | ------ |
| 27    | Module OG backend Fastify (3 endpoints Satori) | 5       | 5h     |
| 28    | Validation Zod inputs OG                       | 5       | 30 min |
| 29    | Tests snapshots Satori + E2E OG                | 5       | 2h     |
| 30    | Tests `groups/routes.ts`                       | 1       | 4h     |
| 31    | Fallback `pg_trgm` recherche                   | 3       | 1h     |

---

## 4. Métriques globales

| Métrique                    | Valeur                                                 |
| --------------------------- | ------------------------------------------------------ |
| Charge totale estimée       | **~43h** (~5.5 jours)                                  |
| Éléments P0 (bloquants)     | 3 (recherche, OG stubs, couverture)                    |
| Quick wins (< 30 min)       | 4 (OG stubs, validation theme × 2, unaccent)           |
| Nouveaux fichiers           | ~12 (fixtures, OG, themes, ranking, tests intégration) |
| Dépendances externes        | 1 (`satori` pour backend)                              |
| Modifications schéma DB     | Aucune                                                 |
| Configuration CI            | Service PostgreSQL + DATABASE_URL                      |
| Cible couverture après plan | 60-65% global, ≥80% modules métier                     |

---

## 5. Risques transverses

| Risque                                                              | Probabilité | Impact                     | Mitigation                                                   |
| ------------------------------------------------------------------- | ----------- | -------------------------- | ------------------------------------------------------------ |
| Complexité `groups/routes.ts` sous-estimée (CTE PostgreSQL lourdes) | Moyenne     | Retard 2-3h                | Commencer par les tests simples, repousser groups en dernier |
| `satori` + WASM dans Fastify : problèmes de chargement              | Faible      | Blocage OG                 | Spike technique 1h avant implémentation complète             |
| Fixtures de seed insuffisantes pour les edge cases QA               | Moyenne     | Tests intégration fragiles | Itérer sur les fixtures avec le QA-engineer                  |
| TanStack Start ≥1.170 avant déplacement des stubs OG                | Très faible | Activation silencieuse     | Faire l'étape 1 **immédiatement** (5 min)                    |
| Divergence d'opinion sur la couverture frontend vs backend          | Faible      | Débat méthodologique       | Commencer par le backend (risque métier), frontend en P3     |

---

---

## 6. Suivi d'exécution

### Semaine 1 — Blocages et quick wins ✅ (2026-05-22)

| #   | Action                                                              | Statut                                                                  |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Déplacer stubs OG hors `src/routes/` → `apps/frontend/stubs/og/`    | ✅                                                                      |
| 2   | Corriger `toPrefixTsQuery` (préfixe tous les mots) → `ts-query.ts`  | ✅                                                                      |
| 3   | Ajouter `unaccent()` dans les requêtes PG                           | ✅                                                                      |
| 4   | Tests unitaires `toPrefixTsQuery` (15 cas) → `ts-query.test.ts`     | ✅                                                                      |
| 5   | Validation Zod `ThemeSlug` backend → `ThemeSlug.regex(...).max(50)` | ✅                                                                      |
| 6   | Validation Zod `theme` frontend → `ThemeSlugOptional.safeParse()`   | ✅                                                                      |
| 7   | Normalisation `ts_rank / length()` inter-types                      | ✅                                                                      |
| 8   | Interleave députés/scrutins                                         | ⚠️ Non implémenté (normalisation `ts_rank` rend le tri global cohérent) |

### Semaine 2 — Intégration et tests critiques ✅ (2026-05-22)

| #   | Action                                                                               | Statut |
| --- | ------------------------------------------------------------------------------------ | ------ |
| 9   | Fixtures de seed déterministes (`test-utils/fixtures.ts`)                            | ✅     |
| 10  | Service PostgreSQL dans CI (`.github/workflows/ci.yml`)                              | ✅     |
| 11  | Tests intégration `search.integration.test.ts` (5 scénarios)                         | ✅     |
| 12  | Tests intégration `compare.integration.test.ts` (6 scénarios)                        | ✅     |
| 13  | Tests intégration `scrutins.integration.test.ts` (4 scénarios)                       | ✅     |
| 14  | Tests intégration `deputies.integration.test.ts` (4 scénarios)                       | ✅     |
| —   | Tests intégration `repository.integration.test.ts` (5 scénarios)                     | ✅     |
| —   | Tests intégration `health.integration.test.ts` (1 scénario)                          | ✅     |
| —   | Bugs corrigés : ORDER BY ts_rank, vote_position ::text, curseurs ::date, flush Redis | ✅     |

**Total** : 125 unitaires + 25 intégration = **150 tests**

### Semaine 3 — Couverture backend ✅ (2026-05-22)

| #   | Action                                                                          | Statut |
| --- | ------------------------------------------------------------------------------- | ------ |
| 15  | Tests `scrutins/repository.ts` → `repository.integration.test.ts` (9 scénarios) | ✅     |
| 16  | Tests `deputies/routes.ts` → `deputies.integration.test.ts` (8 scénarios)       | ✅     |
| 17  | Tests `scrutins/routes.ts` → `scrutins.integration.test.ts` (9 scénarios)       | ✅     |
| 18  | Tests `compare/routes.ts` + `compare/repository.ts` (9 + 4 scénarios)           | ✅     |

**Total** : 125 unitaires + 50 intégration = **175 tests**

### Semaine 4 — Thèmes, E2E, frontend ✅ (2026-05-22)

| #   | Action                                                                  | Statut |
| --- | ----------------------------------------------------------------------- | ------ |
| 19  | Module `GET /api/v1/themes`                                             | ✅     |
| 20  | `GET /api/v1/search?theme=X` (+ suggestions)                            | ✅     |
| 21  | Tests intégration themes + search filtré (6 scénarios)                  | ✅     |
| 22  | E2E Playwright : recherche + comparateur (3 scénarios API)              | ✅     |
| 23  | E2E Playwright : filtre thématique + pagination (frontend)              | ✅     |
| 24  | E2E Playwright : mobile + erreurs (frontend)                            | ✅     |
| 25  | Tests hooks frontend (`useSearch`, `useComparison`, `useThemeScrutins`) | ✅     |
| 26  | Tests composants frontend (EmptyState, ErrorFallback, SkeletonCard)     | ✅     |

**Total** : 137 unitaires + 56 intégration + 13 E2E = **206 tests** (193 Vitest + 13 Playwright)

### Semaine 5 — OG et finitions (à venir)

---

_Synthèse produite par croisement des audits security-engineer, qa-engineer et backend-developer du 2026-05-22._  
_Dernière mise à jour : 2026-05-22 (semaines 1-4 terminées)._
