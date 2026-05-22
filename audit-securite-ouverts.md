# Audit de Sécurité — 5 Éléments Toujours Ouverts

**Date** : 2026-05-22  
**Auditeur** : Security Engineer (shift-left)  
**Périmètre** : Codebase Veritas — `apps/backend/src/modules/`, `apps/frontend/src/routes/api/og/`, `packages/shared/src/db/schema.ts`  
**Référence** : `docs/ETAT_PROJET.md` (dernière mise à jour 2026-05-22)

---

## Verdict Global : CHANGES-REQUIRED

**2 blocages** (Item 3 — bug fonctionnel `toPrefixTsQuery`, Item 5 — stubs OG), **3 correctifs requis** (Items 1, 2, 4).

---

## Item 1 — Couverture de tests insuffisante

| Attribut | Valeur |
|----------|--------|
| **Sévérité** | 🔴 **HIGH** |
| **Catégorie** | OWASP A06:2021 — Composants vulnérables et obsolètes / CWE-1070: Test Coverage |
| **Vecteur** | Régression non détectée dans les surfaces critiques (recherche, filtres, comparaison) |

### État des lieux

| Module | Fichiers testés | Lignes clés non couvertes |
|--------|----------------|--------------------------|
| `search/routes.ts` | ❌ Aucun | `toPrefixTsQuery`, `rethrowTextSearchValidationError`, fusion députés/scrutins |
| `scrutins/routes.ts` | ❌ Aucun | Validation `theme`, `type`, combinaisons de filtres |
| `scrutins/repository.ts` | ❌ Aucun | Filtre thématique par `inArray` + subquery, `withTextSearchErrorHandling` |
| `deputies/routes.ts` | ❌ Aucun | Résolution slug/ID, pagination cursor |
| `deputies/repository.ts` | ❌ Aucun | `plainto_tsquery` sur noms, jointures affiliations |
| `compare/routes.ts` | ❌ Aucun | `resolveDeputyId` (logique PA-prefix vs slug) |
| `compare/repository.ts` | ❌ Aucun | CTE `common_scrutins`, jointures `scrutinVotes` × 4 tables |
| `groups/routes.ts` | ❌ Aucun | Intégralité |
| Frontend global | 1 fichier (2 tests) | `useSearch`, `useThemeScrutins`, `recherche.tsx`, composants |

**Modules avec tests** : `common/cache.test.ts` (13 tests ✅), `compare/service.test.ts` (8 tests ✅), `common/errors.test.ts`, `common/pagination.test.ts`.  
**Total backend** : 42 tests sur ~6 fichiers testés sur 21 fichiers de code.

### Risque concret

1. **`toPrefixTsQuery`** est le seul rempart entre l'input utilisateur et `to_tsquery('french', ...)`. Toute modification future de cette fonction (ex : changement de regex, ajout d'opérateurs) peut ouvrir une injection tsquery sans qu'aucun test ne le détecte.

2. **`rethrowTextSearchValidationError`** intercepte le code PostgreSQL `42601`. Si Drizzle change son wrapping d'erreurs ou si PostgreSQL émet un code différent, l'erreur remonte jusqu'au client avec potentiellement des détails internes (stack trace, noms de colonnes).

3. **`resolveDeputyId`** dans `compare/routes.ts` — si la logique `startsWith("PA")` est modifiée sans test, des slugs malveillants (ex : `PA-admin`) pourraient être interprétés comme IDs directs.

### Recommandation

| Priorité | Action | Effort |
|----------|--------|--------|
| **P0** | Ajouter des tests unitaires sur `toPrefixTsQuery` couvrant : chaîne vide, Unicode mixte, injection tentée (`' OR 1=1 --`, `!|&()`), très longue chaîne, uniquement ponctuation | 1h |
| **P0** | Ajouter des tests sur `resolveDeputyId` : slug valide, ID `PA...` valide, `PA`-prefix sans être un vrai ID, slug inexistant | 30min |
| **P1** | Tests d'intégration `search/routes.ts` : requêtes valides/invalides, limite, cas sans résultats, injection tsquery via caractères Unicode exotiques | 2h |
| **P1** | Tests `scrutins/repository.ts` : filtre `theme` avec slug valide, slug inexistant, slug très long, slug avec caractères spéciaux | 1h |
| **P2** | Tests frontend `recherche.tsx` : validation des search params, changement de type, changement de thème | 2h |

---

## Item 2 — Absence de tests d'intégration / E2E

| Attribut | Valeur |
|----------|--------|
| **Sévérité** | 🟠 **MEDIUM** |
| **Catégorie** | CWE-1119: Inadequate Testing / OWASP A05:2021 — Security Misconfiguration |
| **Vecteur** | Désynchronisation API client/serveur, CORS/rate-limit non vérifiés en conditions réelles |

### État des lieux

- **Aucun test E2E** : ni Playwright, ni Cypress, ni supertest contre le backend démarré
- **Aucun test d'intégration backend** : `health.integration.test.ts` est ignoré sans `DATABASE_URL`
- **Aucun test de contrat API** : les types `ApiResponse<T>` côté frontend et les `response` Zod côté backend sont décorrélés — une divergence de schéma n'est détectée qu'à l'exécution

### Risque concret

1. **Divergence API silencieuse** : le schéma Zod `SearchPayloadSchema` côté backend définit un shape différent de `SearchResultDepute[]` côté frontend. Si l'un évolue sans l'autre, le frontend peut recevoir des champs inconnus et les afficher sans échappement.

2. **CORS non testé** : si `VITE_API_BASE_URL` pointe vers une autre origine en production, les en-têtes CORS doivent être configurés côté backend (`@fastify/cors`). Aucun test ne valide que les requêtes cross-origin fonctionnent.

3. **Rate limiting non vérifié** : le Redis rate-limit store (`redis-rate-limit-store.ts`) existe mais aucun test ne confirme que les routes de recherche/compare/scrutins sont effectivement protégées contre le brute-force.

4. **Cache invalidation** : `CacheService` utilise un système de génération. Aucun test ne vérifie que post-ETL, les caches `/compare` et `/scrutins` sont invalidés.

### Recommandation

| Priorité | Action | Effort |
|----------|--------|--------|
| **P1** | Ajouter un test d'intégration `search` via `app.inject()` Fastify : POST/GET complet → vérifier code 200, structure Zod conforme | 2h |
| **P1** | Ajouter un test d'intégration `compare` : 2 députés valides → vérifier structure de réponse complète, taux de concordance cohérent | 1h30 |
| **P2** | Smoke test E2E Playwright : page `/recherche` → taper "macron" → vérifier au moins 1 résultat député | 2h |
| **P3** | Test de contrat API : extraire les schémas Zod de réponse et les comparer avec les types `api-types.ts` via un script CI | 3h |

---

## Item 3 — Biais et risques d'injection dans les suggestions de recherche

| Attribut | Valeur |
|----------|--------|
| **Sévérité** | 🔴 **HIGH** |
| **Catégorie** | CWE-89: SQL Injection (indirect via tsquery) / CWE-694: Use of Incorrect Operator |
| **Vecteur** | Injection via `to_tsquery` avec input partiellement nettoyé |

### Analyse du code

Fichier : `apps/backend/src/modules/search/routes.ts`

```typescript
function toPrefixTsQuery(q: string): string {
  const safeQ = q.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  return safeQ ? `${safeQ}:*` : "";
}
```

Cette fonction est utilisée dans la route `/search/suggestions` avec `to_tsquery('french', ...)`, tandis que la route `/search` principale utilise `plainto_tsquery('french', ...)` (plus sûr).

### Vulnérabilités identifiées

#### 3.1 — Bug fonctionnel : préfixe sur dernier mot uniquement (HIGH)

```typescript
return safeQ ? `${safeQ}:*` : "";
```

Pour `q = "jean dupont"`, le résultat est `"jean dupont:*"` → `to_tsquery('jean & dupont:*')`.  
**Comportement attendu** : les deux mots devraient être préfixés → `"jean:* & dupont:*"`.  
**Comportement réel** : seul le dernier mot bénéficie de la recherche par préfixe. « jean » est recherché comme correspondance exacte (stemming uniquement).

**Impact** : un utilisateur tapant « jean dup » ne trouvera pas « Jean Dupont » car seul « dup » est préfixé. Les suggestions sont incomplètes, ce qui constitue un biais fonctionnel.

#### 3.2 — Double chemin `to_tsquery` vs `plainto_tsquery` (MEDIUM)

| Route | Fonction PG | Nettoyage |
|-------|------------|-----------|
| `/search/suggestions` | `to_tsquery` | Regex `toPrefixTsQuery` |
| `/search` | `plainto_tsquery` | Aucun (PostgreSQL nettoie) |
| `/scrutins?q=` | `plainto_tsquery` | Aucun (PostgreSQL nettoie) |
| `/deputies?q=` | `plainto_tsquery` | Aucun (PostgreSQL nettoie) |

Le chemin `/search/suggestions` est le **seul** à utiliser `to_tsquery` avec nettoyage manuel. Cette divergence est un risque : si la regex est modifiée sans comprendre l'impact, ou si PostgreSQL évolue dans son parsing des opérateurs tsquery, une injection devient possible.

#### 3.3 — Biais de classement par `ts_rank` (LOW)

Les députés et scrutins sont fusionnés via `ts_rank` puis `slice(0, maxResults)`. PostgreSQL `ts_rank` favorise les documents courts. Conséquence : un député au nom court (ex : « Éric Ciotti ») sera toujours mieux classé qu'un député au nom long (ex : « Marie-Christine Dalloz »), même si ce dernier est plus pertinent. Ce biais n'est pas un risque sécurité direct mais peut être exploité pour du « SEO poisoning » si un attaquant peut influencer les données indexées.

#### 3.4 — Erreur PostgreSQL non interceptée hors 42601 (LOW)

`rethrowTextSearchValidationError` n'intercepte que le code `42601` (syntax_error). Si `to_tsquery` génère une autre erreur (ex : stack depth, memory), celle-ci remonte non traduite.

### Recommandation

| Priorité | Action | Effort |
|----------|--------|--------|
| **P0** | **Corriger `toPrefixTsQuery`** pour préfixer chaque mot : `safeQ.split(/\s+/).map(w => w + ':*').join(' & ')` — ou mieux, **remplacer `to_tsquery` par `plainto_tsquery`** + `to_tsquery('french', replace(plainto_tsquery_output, ')', ':*'))` via SQL | 1h |
| **P0** | Ajouter un test unitaire : `toPrefixTsQuery("jean dup")` → doit matcher « Jean Dupont » | 30min |
| **P1** | Uniformiser : utiliser `plainto_tsquery` systématiquement, supprimer `toPrefixTsQuery` et le remplacer par une construction SQL `plainto_tsquery` + `ts_rewrite` ou utiliser `phraseto_tsquery` + stemming | 2h |
| **P2** | Normaliser `ts_rank` par longueur de document (`ts_rank(...) / (1 + length(...))`) pour réduire le biais documents courts | 30min |

---

## Item 4 — Filtre thématique croisé (risque injection SQL)

| Attribut | Valeur |
|----------|--------|
| **Sévérité** | 🟡 **LOW** |
| **Catégorie** | CWE-20: Improper Input Validation |
| **Vecteur** | Paramètre `theme` non validé au-delà de `z.string()` |

### Analyse du code

**Backend** — `scrutins/routes.ts` :
```typescript
theme: z.string().optional(),   // ← Aucune contrainte de format/longueur
```

**Repository** — `scrutins/repository.ts` :
```typescript
if (filters.theme) {
  conditions.push(
    inArray(
      scrutins.id,
      db.select({ scrutinId: scrutinThemes.scrutinId })
        .from(scrutinThemes)
        .innerJoin(themes, eq(scrutinThemes.themeId, themes.id))
        .where(eq(themes.slug, filters.theme)),  // ← Drizzle paramétrise → pas d'injection SQL
    ),
  );
}
```

**Frontend** — `recherche.tsx` :
```typescript
theme: typeof search.theme === "string" ? search.theme : undefined,  // ← N'importe quelle string
```

### Évaluation

✅ **Pas d'injection SQL** : Drizzle `eq()` utilise systématiquement des requêtes paramétrées (`$1`). Le `theme` est passé comme paramètre lié, pas interpolé dans le SQL.

⚠️ **Risques résiduels** :

1. **Absence de validation de format** : le schéma `themes.slug` est `varchar(50)` avec contrainte UNIQUE. Une valeur comme `../../../etc/passwd` ne fera rien côté SQL (paramètre lié), mais elle traverse toute la stack sans être rejetée. Ce n'est pas un risque direct mais ça indique une validation laxiste.

2. **Absence de limite de longueur** : `z.string()` sans `.max()` permet des chaînes arbitrairement longues. PostgreSQL rejettera les valeurs > 50 caractères au niveau de la colonne `slug varchar(50)`, mais l'erreur remonte au client. Actuellement, ce serait une erreur 500 générique — pas idéal mais pas critique.

3. **Cache poisoning** : le thème fait partie de la clé de cache (`hashCacheKeyPart(filters)`). Un attaquant peut générer un grand nombre de clés de cache uniques en variant `theme`, saturant Redis avec des entrées inutiles. Le TTL de 300s limite l'impact, mais combiné avec `limit` et `sort`, la combinatoire est élevée.

4. **Timing side-channel** : en mesurant le temps de réponse pour `theme=existe` vs `theme=inexiste`, un attaquant pourrait énumérer les thèmes valides. Cependant, les thèmes sont des données publiques, donc l'impact est nul.

### Recommandation

| Priorité | Action | Effort |
|----------|--------|--------|
| **P1** | Ajouter validation Zod : `z.string().min(1).max(50).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)` sur le paramètre `theme` dans `scrutins/routes.ts` | 15min |
| **P2** | Ajouter validation identique côté frontend dans `validateSearch` de `recherche.tsx` | 10min |
| **P3** | Envisager un rate-limit spécifique sur le paramètre `theme` pour prévenir le cache stuffing (si Redis montre des signes de saturation) | 30min |

---

## Item 5 — Routes OG non branchées (Satori SSR)

| Attribut | Valeur |
|----------|--------|
| **Sévérité** | 🔴 **HIGH** (potentiel — bombes à retardement) |
| **Catégorie** | CWE-79: Cross-Site Scripting / CWE-116: Improper Output Encoding |
| **Vecteur** | Input utilisateur non validé dans le rendu Satori → SVG non échappé si activé |

### État des lieux

**Fichiers concernés** :
- `apps/frontend/src/routes/api/og/comparateur.tsx` (paramètre `score` non validé)
- `apps/frontend/src/routes/api/og/depute.tsx` (paramètre `slug` non validé)
- `apps/frontend/src/routes/api/og/scrutin.tsx` (paramètre `id` non validé)

**Statut actuel** : ❌ Non branchés dans le route tree (`routeTree.gen.ts` n'inclut aucune route `/api/og/*`). Les fichiers portent `@ts-nocheck` car `createAPIFileRoute` n'est pas exporté par `@tanstack/react-start` 1.168.

### Risque concret

Ces stubs sont des **bombes à retardement** :

1. **Activation silencieuse** : la mise à jour de TanStack Start vers ≥1.170 exportera `createAPIFileRoute`. Le générateur de route tree de TanStack Router **auto-découvre** les fichiers dans `src/routes/`. Si la nouvelle version inclut les routes API, ces stubs deviendront **immédiatement accessibles** sans modification de code.

2. **Rendu non échappé** : les 3 fichiers prennent des paramètres URL et les injectent directement dans le JSX :
   ```tsx
   // comparateur.tsx
   const score = searchParams.get("score") ?? "0";
   // ... puis dans le JSX :
   <div style={{ fontSize: "96px" }}>{score}</div>
   
   // depute.tsx
   const slug = searchParams.get("slug") ?? "depute";
   // ... puis :
   <div style={{ fontSize: "48px" }}>{slug}</div>
   
   // scrutin.tsx  
   const id = searchParams.get("id") ?? "scrutin";
   // ... puis :
   <div>Scrutin n°{id}</div>
   ```

3. **Satori génère du SVG** : bien que JSX échappe les nœuds texte (`<div>{score}</div>` → Satori encode `<` et `>`), les inputs sont tout de même **injectés dans le DOM SVG sans validation de longueur ni de contenu**. Si Satori a un bug d'échappement dans une future version, ces routes deviennent des vecteurs XSS.

4. **Pas de fonts** : `fonts: []` signifie que Satori utilisera les polices fallback. Si une police manquante cause une erreur Satori, le stack trace pourrait fuiter dans la réponse d'erreur selon la configuration du `errorHandler`.

5. **Cache permanent** : les réponses ont `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`. Si une valeur malveillante est mise en cache (CDN, navigateur), elle y reste jusqu'à 7 jours.

### Recommandation

| Priorité | Action | Effort |
|----------|--------|--------|
| **P0** | **Supprimer les 3 stubs** ou les déplacer hors de `src/routes/` (ex : `src/stubs/og/`) pour éviter l'auto-découverte par TanStack Router | 5min |
| **P0** | Si les stubs sont conservés pour usage futur : ajouter `// IGNORE: do not activate without security review` en en-tête + `.gitattributes` marquant ces fichiers comme `linguist-generated` | 5min |
| **P1** | Avant toute activation : valider `score` avec `z.coerce.number().min(0).max(100)`, `slug` avec `z.string().regex(/^[a-z0-9-]+$/).max(255)`, `id` avec `z.string().regex(/^[A-Z0-9]+$/).max(50)` | 30min |
| **P1** | Ajouter `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'` sur les réponses OG pour défense en profondeur | 15min |
| **P1** | Réduire `max-age` à 3600 (1h) au lieu de 86400 (24h) pour limiter la persistance de contenu malveillant en cache | 5min |

---

## Synthèse des priorités

| # | Item | Sévérité | Bloquant ? | Action prioritaire |
|---|------|----------|------------|-------------------|
| 3 | Biais/injection suggestions recherche | 🔴 HIGH | ✅ OUI | **Corriger `toPrefixTsQuery`** — remplacer par `plainto_tsquery` ou préfixer chaque mot |
| 5 | Routes OG non branchées | 🔴 HIGH | ✅ OUI | **Supprimer ou déplacer les stubs** hors de `src/routes/` |
| 1 | Couverture tests | 🔴 HIGH | NON | Ajouter tests sur `toPrefixTsQuery`, `resolveDeputyId`, `rethrowTextSearchValidationError` |
| 2 | Intégration/E2E | 🟠 MEDIUM | NON | Ajouter test d'intégration `search` via `app.inject()` |
| 4 | Filtre thématique | 🟡 LOW | NON | Ajouter validation Zod `theme: z.string().regex(...)` |

---

## Plan de remédiation recommandé

### Semaine 1 (blocages)
1. Déplacer `apps/frontend/src/routes/api/og/*.tsx` → `apps/frontend/src/stubs/og/` (5 min)
2. Corriger `toPrefixTsQuery` dans `apps/backend/src/modules/search/routes.ts` (1 h) : préfixer chaque mot
3. Ajouter tests unitaires pour `toPrefixTsQuery` (1 h)

### Semaine 2 (durcissement)
4. Ajouter validation Zod sur `theme` dans `scrutins/routes.ts` (15 min)
5. Ajouter test d'intégration search (2 h)
6. Ajouter tests `resolveDeputyId` (30 min)

### Semaine 3 (couverture)
7. Tests `scrutins/repository.ts` — filtre thématique (1 h)
8. Tests frontend `recherche.tsx` — validation search params (2 h)
9. Smoke test E2E Playwright (2 h)

---

*Rapport généré automatiquement. Toute déviation du plan de remédiation doit être documentée avec justification et approbation du tech-lead.*
