# Audit backend — 5 éléments ouverts

**Date** : 2026-05-22  
**Auteur** : backend-developer  
**Référence** : `docs/ETAT_PROJET.md` (section « Toujours ouverts »)

---

## Vue d'ensemble

| # | Élément | Complexité | Dépendances |
|---|---------|------------|-------------|
| 1 | Couverture tests | **Moyen** | Aucune |
| 2 | Intégration/E2E | **Moyen** | Élément 1 (tests unitaires aident à concevoir les fixtures) |
| 3 | Biais suggestions recherche | **Moyen** | Aucune (code autonome dans `search/routes.ts`) |
| 4 | Filtre thématique croisé | **Facile** | Dépend du schéma existant (OK), de l'ETL classifier (OK) |
| 5 | Route OG non branchée | **Facile** | Indépendant (nouvel endpoint backend) |

---

## 1. Couverture tests — modules backend non testés

### 1.1 État des lieux

| Fichier | Lignes | Testé ? | Tests existants |
|---------|--------|---------|-----------------|
| `common/cache.ts` | 125 | ✅ Oui | 13 tests (`cache.test.ts`) |
| `common/errors.ts` | 68 | ✅ Oui | 10 tests (`errors.test.ts`) |
| `common/pagination.ts` | 82 | ✅ Oui | 11 tests (`pagination.test.ts`) |
| `common/db-errors.ts` | 54 | ❌ Non | 0 — fonctions pures, trivial |
| `common/schemas.ts` | 13 | ❌ Non | 0 — exports de types Zod |
| `common/redis-rate-limit-store.ts` | 108 | ❌ Non | 0 — code infra Redis |
| `compare/service.ts` | 171 | ✅ Oui | 7 tests (`service.test.ts`) |
| `compare/repository.ts` | 97 | ❌ Non | 0 — requêtes CTE |
| `compare/routes.ts` | 127 | ❌ Non | 0 — handler + résolution slug |
| `deputies/repository.ts` | 352 | ❌ Non | 0 — **module le plus complexe** |
| `deputies/service.ts` | 72 | ❌ Non | 0 — wrapper cache mince |
| `deputies/routes.ts` | 260 | ❌ Non | 0 — 4 endpoints REST |
| `scrutins/repository.ts` | 237 | ❌ Non | 0 — search + pagination curseur |
| `scrutins/service.ts` | 57 | ❌ Non | 0 — wrapper cache mince |
| `scrutins/routes.ts` | 175 | ❌ Non | 0 — 3 endpoints REST |
| `groups/routes.ts` | 206 | ❌ Non | 0 — SQL raw + stats |
| `search/routes.ts` | 261 | ❌ Non | 0 — **logique ranking à risque** |
| `health.integration.test.ts` | 59 | ⚠️ Partiel | 2 tests, ignorés sans `DATABASE_URL` |

**Total backend non-testé** : ~1850 lignes de code métier sur ~2450 (75%).

### 1.2 Complexité estimée par module

#### Trivial (⩽ 30 min chacun)
- **`common/db-errors.ts`** — 3 fonctions pures, mock-free, ~5 cas de test
- **`common/schemas.ts`** — valider que `DateString` parse/rejette correctement

#### Facile (1h chacun)
- **`deputies/service.ts`** — mocker `DeputyRepository` + `CacheService`, ~6 tests
- **`scrutins/service.ts`** — idem pattern compare/service, ~5 tests
- **`compare/repository.ts`** — nécessite une DB de test ou mock Drizzle, ~4 tests

#### Moyen (2-3h chacun)
- **`deputies/repository.ts`** — 5 méthodes, filtres complexes, stats SQL, nécessite setup DB test
- **`scrutins/repository.ts`** — 4 méthodes, curseurs, filtre theme, nécessite setup DB test
- **`compare/routes.ts`** — mocker `CompareService`, test de résolution slug, ~6 scénarios
- **`deputies/routes.ts`** — 4 endpoints, résolution slug/ID, profils, ~10 scénarios
- **`scrutins/routes.ts`** — 3 endpoints, pagination, ~8 scénarios
- **`search/routes.ts`** — 2 endpoints, ranking, suggestion merge, ~12 scénarios

#### Difficile (4-5h)
- **`groups/routes.ts`** — 2 endpoints, CTE PostgreSQL complexes (`AVG` sur sous-requêtes), calculs de loyauté/participation, nécessite DB test avec données représentatives

### 1.3 Recommandations

Priorité P0 (sécurité métier) :
1. `deputies/repository.ts` — cœur du domaine, erreurs de stats = données erronées affichées
2. `search/routes.ts` — ranking actuel non testé, facile à casser
3. `scrutins/repository.ts` — pagination curseur + filtre theme

Priorité P1 :
4. Routes (deputies, scrutins, compare, groups) — couverture de contrat API

Priorité P2 :
5. Services minces et utilitaires

---

## 2. Intégration/E2E — setup test DB, fixtures, scénarios API

### 2.1 Infrastructure existante

Le projet dispose déjà de briques réutilisables :

```
apps/backend/src/test-utils/
├── database.ts   # setupTestDatabase() → Pool, migrations, extension pg_trgm, legislature 17
├── http.ts       # createTestApp(), destroyTestApp(), injectJson<T>()
└── index.ts      # re-exports
```

**Ce qui fonctionne** :
- `setupTestDatabase()` crée un pool PG, lance `drizzle migrate`, insère la législature 17
- `injectJson()` parse automatiquement le JSON et expose `{ status, body, headers }`
- `health.integration.test.ts` montre le pattern (mais ignoré sans `DATABASE_URL`)

### 2.2 Ce qui manque

| Besoin | État | Action |
|--------|------|--------|
| Fixtures seed data | ❌ Absent | Créer `test-utils/fixtures.ts` avec factories pour deputies, scrutins, votes, themes |
| DB de test en CI | ❌ Non configuré | Ajouter service PostgreSQL au workflow GitHub Actions `.github/workflows/ci.yml` |
| `DATABASE_URL` en CI | ❌ Non défini | Variable d'env dans le job CI |
| Nettoyage entre tests | ❌ Pas de helper | Fonction `clearTables()` utilisant `TRUNCATE ... CASCADE` |
| Tests d'intégration modulaires | ❌ 1 seul fichier | Fichiers `*.integration.test.ts` par module |

### 2.3 Fixtures nécessaires

```typescript
// test-utils/fixtures.ts — à créer

// Factory minimal pour un test d'intégration
export interface TestFixtures {
  legislature: { id: "17"; startDate: Date; isCurrent: true };
  groups: Array<{ id: string; name: string; abbreviation: string }>;
  deputies: Array<{ id: string; firstName: string; lastName: string; slug: string }>;
  scrutins: Array<{ id: string; numero: number; titre: string; dateScrutin: Date }>;
  votes: Array<{ scrutinId: string; deputyId: string; position: VotePosition }>;
  themes: Array<{ slug: string; label: string }>;
  scrutinThemes: Array<{ scrutinId: string; themeSlug: string }>;
}

// Exemple : 3 députés, 5 scrutins, votes croisés → permet de tester
// le comparateur, la recherche, les stats, la pagination
```

### 2.4 Scénarios API à couvrir

#### Module `search`
| Scénario | Endpoint | Vérifications |
|----------|----------|---------------|
| Recherche vide → 400 | `GET /api/v1/search/suggestions` | Code 400, message validation |
| Recherche nom exact | `GET /api/v1/search/suggestions?q=Martin` | Contient le deputy, ts_rank > 0 |
| Recherche titre scrutin | `GET /api/v1/search/suggestions?q=budget` | Contient le scrutin, ordre pertinent |
| Résultats mixtes triés | `GET /api/v1/search?q=ecole` | deputies + scrutins, ordre cohérent |
| Max results respecté | `GET /api/v1/search/suggestions?q=a&limit=3` | ≤ 3 résultats |

#### Module `compare`
| Scénario | Endpoint | Vérifications |
|----------|----------|---------------|
| 2 députés, votes identiques | `GET /api/v1/compare?deputies=slug1,slug2` | concordanceRate = 100 |
| 2 députés, votes opposés | `GET /api/v1/compare?deputies=slug1,slug2` | divergences.length > 0 |
| 3 députés, pairwise | `GET /api/v1/compare?deputies=s1,s2,s3` | pairwise.length = 3 |
| Moins de 2 députés → 400 | `GET /api/v1/compare?deputies=slug1` | Erreur validation |
| Plus de 5 députés → 400 | `GET /api/v1/compare?deputies=s1,...,s6` | Erreur validation |
| Filtre période | `GET /api/v1/compare?deputies=s1,s2&from=2024-06-01&to=2024-07-01` | Votes filtrés |

#### Module `scrutins`
| Scénario | Endpoint | Vérifications |
|----------|----------|---------------|
| Liste paginée | `GET /api/v1/scrutins?limit=2` | 2 items, nextCursor non-null |
| Page 2 via curseur | `GET /api/v1/scrutins?cursor=...` | Pas de doublons avec page 1 |
| Filtre thème | `GET /api/v1/scrutins?theme=sante` | Tous les scrutins ont le thème santé |
| Détail scrutin | `GET /api/v1/scrutins/VTANR5L17V1` | Thèmes + groupVotes inclus |

#### Module `deputies`
| Scénario | Endpoint | Vérifications |
|----------|----------|---------------|
| Fiche par slug | `GET /api/v1/deputies/jean-dupont` | Profil + stats |
| Fiche par ID PA | `GET /api/v1/deputies/PA1234` | Même résultat |
| Slug inconnu → 404 | `GET /api/v1/deputies/inconnu` | NotFoundError |
| Votes paginés | `GET /api/v1/deputies/jean-dupont/votes?limit=2` | Cursor pagination |

### 2.5 Configuration CI

Ajouter au workflow `.github/workflows/ci.yml` :

```yaml
services:
  postgres:
    image: postgres:17
    env:
      POSTGRES_USER: veritas
      POSTGRES_PASSWORD: veritas
      POSTGRES_DB: veritas_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

env:
  DATABASE_URL: postgres://veritas:veritas@localhost:5432/veritas_test
```

### 2.6 Complexité estimée

- Fixtures + seed : **2h**
- 5 fichiers `*.integration.test.ts` (search, compare, scrutins, deputies, groups) : **5h**
- CI config : **30 min**
- **Total : ~7h30, complexité moyenne**

---

## 3. Biais suggestions recherche — algorithme actuel et améliorations

### 3.1 Algorithme actuel (analyse de `search/routes.ts`)

```
GET /search/suggestions?q=<query>&limit=<N>

1. Nettoie la query : supprime tout sauf \p{L}\p{N}\s
2. Forme une ts_query prefix : "mot1:* & mot2:*"
3. Exécute DEUX requêtes indépendantes :
   - deputies (lastName + firstName, ts_rank, LIMIT N)
   - scrutins (titre + objet, ts_rank, LIMIT N)
4. Merge les résultats, tri GLOBAL par ts_rank décroissant
5. Tronque à N résultats
```

### 3.2 Problèmes identifiés

#### 🔴 Problème 1 : Scores incomparables entre types
`ts_rank()` est **dépendant de la longueur du document**. Un député « Martin » (2 mots) aura un `ts_rank` beaucoup plus élevé qu'un scrutin « Proposition de loi relative à l'organisation… » (20+ mots) pour le même terme, car `ts_rank` normalise par la longueur du document.

**Conséquence** : pour une query comme « martin », les députés dominent systématiquement ; pour « environnement », les scrutins dominent. L'ordre merge est trompeur.

#### 🟡 Problème 2 : Aucune diversité inter-types
Si `N=10`, il est possible que les 10 résultats soient tous des députés ou tous des scrutins. Aucun mécanisme n'assure une représentation minimale de chaque type.

#### 🟡 Problème 3 : Pas de boosting sur les champs forts
Un match exact sur `slug` (ex: query = "jean-dupont") n'est pas boosté par rapport à un match partiel sur `titre`.

#### 🟡 Problème 4 : Pas de fallback trigram pour les typos
Si l'utilisateur tape « marti » (faute de frappe), `to_tsquery` ne stemmera pas correctement. L'extension `pg_trgm` est installée mais non utilisée dans la recherche.

#### 🟢 Problème 5 : `toPrefixTsQuery` supprime les accents
Le regex `[^\p{L}\p{N}\s]` supprime les accents ET la ponctuation. `"écolo"` → `"colo:*"` qui ne matchera pas `écologie`. Il faut utiliser `unaccent()` côté PostgreSQL (l'extension est déjà installée).

### 3.3 Améliorations proposées

#### Phase 1 — Corrections immédiates (1-2h)

**1a. Normalisation des rangs**
```typescript
// Après chaque requête, normaliser les ts_rank entre 0 et 1
function normalizeRanks<T extends { rank: number }>(rows: T[]): T[] {
  const max = rows.length > 0 ? Math.max(...rows.map(r => r.rank)) : 1;
  return rows.map(r => ({ ...r, rank: r.rank / max }));
}
```
Puis appliquer un facteur de pondération par type (ex: scrutin × 0.9 car textes plus longs).

**1b. Alternance député/scrutin dans les résultats**
```typescript
// Interleave : D1, S1, D2, S2, D3, S3...
function interleave<T>(a: T[], b: T[]): T[] {
  const result: T[] = [];
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < a.length) result.push(a[i]!);
    if (i < b.length) result.push(b[i]!);
  }
  return result;
}
```

**1c. Utiliser `unaccent` dans les queries PostgreSQL**
```sql
-- Actuel
to_tsvector('french', coalesce(lastName, '') || ' ' || coalesce(firstName, ''))

-- Corrigé
to_tsvector('french', unaccent(coalesce(lastName, '') || ' ' || coalesce(firstName, '')))
```

#### Phase 2 — Améliorations avancées (3-4h)

**2a. Fallback trigram pour requêtes courtes (≤ 3 caractères)**
```sql
-- Si la recherche full-text ne donne rien, fallback pg_trgm
WHERE similarity(unaccent(last_name || ' ' || first_name), $q) > 0.3
ORDER BY similarity DESC
```

**2b. Exact-match boosting sur slug**
```sql
-- Ajouter un score bonus si la query correspond exactement au slug
CASE WHEN slug = $q THEN 1.0 ELSE 0.0 END AS exact_match_boost
```

**2c. Pondération configurable par type**
```typescript
const TYPE_WEIGHTS = {
  deputy: 1.0,   // pénalité nulle (textes courts, ts_rank déjà favorable)
  scrutin: 1.2,  // boost compensatoire (textes longs)
};
```

### 3.4 Fichiers à modifier

| Fichier | Action | Lignes |
|---------|--------|--------|
| `apps/backend/src/modules/search/routes.ts` | Refactor ranking + interleave | ~100 |
| `apps/backend/src/modules/search/routes.ts` | Ajout fallback trigram | ~30 |
| `apps/backend/src/modules/search/ranking.ts` | **NOUVEAU** — logique de ranking extraite | ~60 |
| `apps/backend/src/modules/search/ranking.test.ts` | **NOUVEAU** — tests unitaires ranking | ~80 |

### 3.5 Complexité estimée

- **Phase 1** : 2h, facile — corrections locales sans extraction
- **Phase 2** : 3h, moyen — extraction ranking + fallback trigram
- **Total : 5h, complexité moyenne**

---

## 4. Filtre thématique croisé — conception API

### 4.1 Schéma existant

Le schéma thématique est déjà complet :

```
themes
├── id (serial, PK)
├── slug (varchar 50, UNIQUE)   ← ex: "sante", "economie"
├── label (varchar 100)          ← ex: "Santé", "Économie"
└── description (text)

scrutin_themes
├── scrutinId (FK → scrutins.id)
├── themeId (FK → themes.id)
├── confidence (decimal 3,2)     ← ex: 0.80
└── UNIQUE(scrutinId, themeId)
```

L'ETL (`packages/etl/src/classifier.ts`) peuple automatiquement ces tables avec 8 thèmes prédéfinis (santé, éducation, économie, environnement, travail, sécurité, institutions, culture).

### 4.2 État actuel du filtrage thème

| Endpoint | Filtre `theme` supporté ? | Mécanisme |
|----------|--------------------------|-----------|
| `GET /scrutins?theme=sante` | ✅ Oui | Sous-requête `scrutinThemes` + `themes` dans `repository.ts` |
| `GET /deputies/:id/votes?theme=sante` | ✅ Oui | `EXISTS` sur `scrutinThemes` + `themes` dans `repository.ts` |
| `GET /search?theme=sante` | ❌ Non | — |
| `GET /search/suggestions?theme=sante` | ❌ Non | — |
| `GET /themes` | ❌ Absent | — |

### 4.3 Conception API proposée

#### Route 1 : `GET /api/v1/themes` (nouvelle)

Liste les thèmes disponibles avec leur nombre de scrutins associés.

```
GET /api/v1/themes?legislature=17

→ 200 {
  data: [{
    slug: "sante",
    label: "Santé",
    scrutinsCount: 42,
    description: null
  }, ...]
}
```

**Implémentation** : jointure simple `themes` → `scrutinThemes` → `scrutins` avec `COUNT` + `GROUP BY`.

**Fichier** : `apps/backend/src/modules/themes/routes.ts` (nouveau module)

#### Route 2 : `GET /api/v1/search?theme=<slug>` (modification existante)

Ajouter le paramètre `theme` optionnel à la route `/search` existante.

```
GET /api/v1/search?q=budget&theme=economie&limit=10

→ Filtre les scrutins sur le thème "economie"
→ Les députés restent cherchés par nom (le filtre thème n'a pas de sens pour eux)
→ Si `theme` est présent sans `q` → liste les scrutins du thème
```

**Jointures Drizzle nécessaires** (pour la partie scrutins) :
```typescript
// Ajouter dans la clause WHERE de la requête scrutins
if (filters.theme) {
  scrutinConditions.push(
    inArray(
      scrutins.id,
      db
        .select({ scrutinId: scrutinThemes.scrutinId })
        .from(scrutinThemes)
        .innerJoin(themes, eq(scrutinThemes.themeId, themes.id))
        .where(eq(themes.slug, filters.theme)),
    ),
  );
}
```

C'est le même pattern déjà utilisé dans `scrutins/repository.ts:68-76`.

#### Route 3 : `GET /api/v1/search/suggestions?theme=<slug>` (modification existante)

Même ajout que pour `/search`, sur la partie scrutins uniquement.

### 4.4 Fichiers à créer/modifier

| Fichier | Action | Lignes |
|---------|--------|--------|
| `apps/backend/src/modules/themes/routes.ts` | **NOUVEAU** — module themes (GET /themes) | ~50 |
| `apps/backend/src/modules/search/routes.ts` | **MODIFIER** — ajout param `theme` aux 2 routes | ~30 |
| `apps/backend/src/app.ts` | **MODIFIER** — enregistrer le plugin themes | +3 |
| `packages/shared/src/schemas/index.ts` | **MODIFIER** — ajout `SearchThemesQuery` | ~10 |

### 4.5 Complexité estimée

- Nouveau module `themes` : 1h
- Modification `search` : 30 min
- Tests unitaires + intégration : 1h30
- **Total : 3h, complexité facile**

---

## 5. Route OG non branchée — exposition API

### 5.1 État actuel

3 fichiers stubs dans `apps/frontend/src/routes/api/og/` :

| Fichier | Route prévue | État |
|---------|-------------|------|
| `depute.tsx` | `GET /api/og/depute?slug=X` | Stub Satori, valeurs statiques « — » |
| `scrutin.tsx` | `GET /api/og/scrutin?id=X` | Stub Satori, valeurs statiques « — » |
| `comparateur.tsx` | `GET /api/og/comparateur?score=X` | Stub Satori, valeurs statiques « — » |

**Blocage actuel** : `createAPIFileRoute` n'est pas exporté par `@tanstack/react-start` en version 1.168 (la version installée). La version ≥ 1.170 est nécessaire. Les fichiers sont annotés `@ts-nocheck` et ne sont **pas inclus dans le route tree généré**.

### 5.2 Options d'exposition

#### Option A : Attendre TanStack Start ≥ 1.170 (frontend)
- ✅ Pas de duplication de code
- ✅ Même stack que le frontend
- ❌ Dépendance externe, pas de date de release garantie
- ❌ Complexité : nécessite une migration TanStack Start
- **Recommandation** : ❌ Trop d'incertitude

#### Option B : Nouveaux endpoints Fastify (backend) — **RECOMMANDÉ**
- ✅ Indépendant de la version TanStack Start
- ✅ Backend déjà maître des données (DB accessible)
- ✅ Satori fonctionne côté Node.js (pas besoin de navigateur)
- ✅ Cache HTTP natif (`Cache-Control` déjà présent dans les stubs)
- ❌ Duplication de la logique de rendu Satori (mais les stubs actuels n'ont quasiment pas de logique)
- **Complexité** : facile

#### Option C : Server Functions TanStack Start (hybride)
- ✅ Reste dans l'écosystème TanStack
- ❌ Pas documenté comme prioritaire (`ETAT_PROJET.md` précise que les Server Functions ne sont pas utilisées)
- ❌ Nécessite refacto du pattern de fetching
- **Recommandation** : ❌ Antipattern par rapport aux choix d'architecture actuels

### 5.3 Implémentation recommandée (Option B)

#### Architecture

```
apps/backend/src/modules/og/
├── routes.ts          # 3 routes Fastify : /og/depute, /og/scrutin, /og/comparateur
├── templates.tsx      # Composants Satori JSX partagés
└── fonts.ts           # Chargement des polices (Inter, Noto Sans...)
```

#### Endpoints

```
GET /api/v1/og/depute?slug=<slug>&legislature=17
  → Requête DB (deputy + stats)
  → Rendu Satori → SVG 1200×630
  → Cache-Control: public, max-age=86400

GET /api/v1/og/scrutin?id=<id>
  → Requête DB (scrutin + votes)
  → Rendu Satori → SVG 1200×630
  → Cache-Control: public, max-age=86400

GET /api/v1/og/comparateur?deputies=s1,s2&legislature=17
  → Requête DB (compare)
  → Rendu Satori → SVG 1200×630
  → Cache-Control: public, max-age=86400
```

#### Dépendance à ajouter

```bash
pnpm add satori --filter apps/backend
```

> ⚠️ **Checkpoint 3** : lancer `security-engineer` pour auditer `satori` avant intégration.

#### Templates Satori

Chaque template reçoit les données réelles du backend :

```typescript
// templates.tsx — exemple pour depute
export function DeputyOGCard(props: {
  firstName: string;
  lastName: string;
  group: string;
  participationRate: number;
  loyaltyRate: number;
  totalVotes: number;
}) { /* JSX Satori avec valeurs réelles */ }
```

#### Cache

Ajouter un cache Redis avec TTL 24h pour éviter le rendu Satori à chaque requête :
```typescript
const cacheKey = `og:depute:${slug}:${legislature}`;
const cached = await cache.get<string>(OG_CACHE_NS, cacheKey);
if (cached) return reply.type("image/svg+xml").send(cached);
```

### 5.4 Fichiers à créer/modifier

| Fichier | Action | Lignes |
|---------|--------|--------|
| `apps/backend/src/modules/og/routes.ts` | **NOUVEAU** — 3 endpoints OG | ~180 |
| `apps/backend/src/modules/og/templates.tsx` | **NOUVEAU** — composants Satori | ~120 |
| `apps/backend/src/modules/og/fonts.ts` | **NOUVEAU** — chargement polices | ~40 |
| `apps/backend/src/app.ts` | **MODIFIER** — enregistrer plugin OG | +3 |
| `apps/frontend/src/routes/api/og/*` | **SUPPRIMER** — stubs obsolètes | suppr. |

### 5.5 Complexité estimée

- Module OG backend (3 routes + 3 templates) : **3h**
- Intégration polices + cache : **1h**
- Tests : **1h**
- Nettoyage frontend : **15 min**
- **Total : 5h15, complexité facile**

---

## Synthèse des dépendances

```
                    ┌─────────────────┐
                    │  4. Thèmes API  │  (facile, 3h)
                    │  5. OG Backend  │  (facile, 5h)
                    └────────┬────────┘
                             │ indépendants
                             ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ 3. Biais search │    │ 1. Tests unit.  │    │ 2. Intégration  │
│   (moyen, 5h)   │    │   (moyen, 12h)  │◄───│   (moyen, 7h30) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       │                        │                      │
       │                        ▼                      │
       │               fixtures partagées ─────────────┘
       │
       ▼
  search/routes.ts
  (fichier commun
   avec élément 4)
```

**Recommandation d'ordre** :
1. **Élément 4** (thèmes) + **Élément 5** (OG) — indépendants, rapides, valeur visible
2. **Élément 3** (biais search) — isolé dans `search/routes.ts`, impact UX direct
3. **Élément 2** (intégration) — dépend des fixtures, mais les tests peuvent être écrits incrémentalement
4. **Élément 1** (couverture) — le plus gros volume, à faire module par module

---

## Métriques globales

| Métrique | Valeur |
|----------|--------|
| Charge totale estimée | **32h45** (4.1 jours) |
| Modules backend non testés | 13 fichiers, ~1850 lignes |
| Nouveaux fichiers à créer | ~8 (fixtures, OG, themes, ranking) |
| Dépendances externes à ajouter | 1 (`satori` pour backend) |
| Modifications schéma DB | Aucune (schéma existant complet) |
| Modifications migrations | Aucune |
| Risque régression | Faible — changements additifs ou isolés |
