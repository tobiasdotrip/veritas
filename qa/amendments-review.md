# QA Review — Texte des amendements dans les scrutins

**Date** : 2026-05-24  
**Scope** : Feature complète — ETL → Backend → Frontend  
**Tests existants** : shared (28), etl (36), backend (76), frontend (28) — tous passent

---

## Résumé

| Sévérité      | Compte | Détail                                                                                                       |
| ------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| 🔴 Bloquant   | 4      | URL AN incorrecte, type `auteurs` incohérent, pas de tests sur le composant utilisé, `articleTitre` orphelin |
| 🟠 Warning    | 4      | Matching cassé pour amendements rectifiés, Phase 2 non-déterministe, composant mort, `confidence` string     |
| 🟡 Suggestion | 5      | Tests ETL amendements absents, tests intégration amendements absents, accessibilité, nettoyage               |

---

## 🔴 BUGS BLOQUANTS

### BUG-1 · URL Assemblée Nationale : `dyn/16` au lieu de `dyn/17`

**Fichier** : `apps/frontend/src/components/scrutin/AmendmentCard.tsx:21`

```typescript
function buildAssembleeUrl(amendmentId: string): string {
  return `https://www.assemblee-nationale.fr/dyn/16/amendements/${amendmentId}`;
}
```

Le projet porte sur la **17e législature**. L'ancien composant `components/AmendmentCard.tsx` utilise correctement `dyn/17`, et les URLs officielles des amendements de la 17e législature sont sur `dyn/17` (cf. `docs/research/api-officielles.md:262` et `implementation/frontend.md:39`).

**Impact** : Tous les liens "Voir sur le site de l'Assemblée Nationale" pointent vers la 16e législature (morte) → **404 ou page incorrecte pour l'utilisateur**.

**Correction** : Remplacer `16` par `17` ligne 21.

---

### BUG-2 · Type mismatch `auteurs` : backend JSONB → frontend `string`

**Fichiers** :

- `packages/shared/src/db/schema.ts:429` → `auteurs: jsonb("auteurs")` (PostgreSQL JSONB)
- `packages/etl/src/parser/amendments.ts` → `auteurs: ParsedAuteur[]` (structuré)
- `apps/backend/src/modules/scrutins/routes.ts:33` → `auteurs: z.unknown().nullable()`
- `apps/frontend/src/lib/api-types.ts:55` → `auteurs: string | null`

Le pipeline est :

1. **Parser** : construit `ParsedAuteur[]` (ex: `[{type:"député", nom:"Dupont"}, ...]`)
2. **Loader** : insère dans `jsonb` → PostgreSQL stocke `[{"type": "député", "nom": "Dupont"}]`
3. **Repository** : sélectionne `amendments.auteurs` → Drizzle renvoie l'objet JS natif
4. **API** : Fastify sérialise en JSON → `[{"type":"député","nom":"Dupont"}]`
5. **Frontend** : reçoit un **tableau d'objets**, pas une string

**Impact dans `scrutin/AmendmentCard.tsx`** :

- Ligne dans `AmendmentMeta` : `` `par ${amendment.auteurs}` `` → affichera `par [object Object],[object Object]`
- Le composant ne formate pas les auteurs individuellement

**Impact dans `components/AmendmentCard.tsx` (l'ancien, mort)** :

- `amendment.auteurs.includes(";")` → **TypeError** si c'est un tableau

**Correction** :

- Option A : Transformer `auteurs` en string dans le backend (ex: `"M. Dupont, Mme Martin"`)
- Option B : Typer correctement côté frontend (`ParsedAuteur[]`) et formater dans `AmendmentMeta`
- Recommandé : Option B + formatage human-readable dans le composant

---

### BUG-3 · Aucun test pour le composant utilisé en production

**Fichier testé** : `apps/frontend/src/components/AmendmentCard.test.tsx` → teste `./AmendmentCard` (l'ancien)

**Fichier importé par la route scrutin** : `apps/frontend/src/components/scrutin/AmendmentCard.tsx` → **zéro test**

Les fonctionnalités non couvertes du composant réellement utilisé :

- Comportement de l'accordéon (fermé par défaut, ouvrable/fermable)
- Troncature du dispositif > 800 car. et bouton "Lire la suite"
- Rendu avec `amendment: null` → retourne `null`
- Rendu avec `dispositif: null` → affiche "Texte non disponible"
- Sous-accordéon "Voir l'exposé des motifs"
- `AmendmentMeta` avec/sans auteurs, articleRef
- `AssembleeLink` avec l'ID

**Correction** : Écrire `apps/frontend/src/components/scrutin/AmendmentCard.test.tsx` couvrant ces cas.

---

### BUG-4 · `articleTitre` orphelin — jamais peuplé par le backend

**Fichiers** :

- `apps/frontend/src/lib/api-types.ts:58` → `articleTitre: string | null`
- `apps/backend/src/modules/scrutins/routes.ts` → `AmendmentSchema` **ne contient pas** `articleTitre`
- `packages/shared/src/db/schema.ts` → table `amendments` n'a **pas de colonne** `article_titre`
- `apps/backend/src/modules/scrutins/repository.ts` → `getWithDetails` ne sélectionne pas `articleTitre`

La colonne n'existe pas en base, n'est pas dans le schéma Zod de l'API, n'est pas sélectionnée par le repository. Elle sera **toujours `null`** côté frontend.

Le seul code qui l'utilise est dans le composant **mort** `components/AmendmentCard.tsx:69` :

```typescript
{
  amendment.articleTitre ? ` — ${formatTitle(amendment.articleTitre)}` : "";
}
```

**Correction** :

- Soit ajouter la colonne `article_titre` en base, la parser dans l'ETL, l'exposer dans l'API
- Soit supprimer `articleTitre` du type frontend (c'est du dead code)
- Vu que la feature a été livrée sans, recommander de **supprimer** pour cette itération

---

## 🟠 WARNINGS

### WARN-1 · Amendements "rect." : matching cassé

**Fichiers** :

- `packages/etl/src/parser/amendments.ts:210-214` → stocke `numero = "1867 rect."` quand `suffixe = " rect."`
- `packages/etl/src/matcher.ts:12-14` → regex extrait `"1867"` (sans le suffixe " rect.")

```
Parser:   numero = "1867" + " rect." → "1867 rect."
Matcher:  titre → "l'amendement n° 1867 (rect.)" → extrait "1867"
Lookup:   amendmentsByNumero.get("1867") → ne trouve PAS "1867 rect."
```

**Impact** : Les amendements rectifiés ne seront jamais matchés aux scrutins, malgré la présence du numéro dans le titre.

**Correction** :

- Option A : Dans le matcher, après un échec de lookup, tenter avec `"1867 rect."`, `"1867 rect. bis"`, etc.
- Option B : Dans le parser, extraire le suffixe dans un champ séparé (`numero: "1867"`, `suffixe: "rect."`) et matcher uniquement sur `numero`
- Recommandé : Option B, plus propre. La regex du matcher ignore déjà `(rect.)`.

---

### WARN-2 · Matcher Phase 2 : choix arbitraire du premier candidat

**Fichier** : `packages/etl/src/matcher.ts:153-160`

```typescript
if (candidates.length > 1) {
  // ...This is a simplified fallback...
  const match = candidates[0]!;
  phase2Batch.push({ scrutinId: s.id, amendmentId: match.id });
  result.skipped++;
}
```

Quand plusieurs amendements partagent le même numéro dans des dossiers différents, Phase 2 prend `candidates[0]` sans aucune disambigüation. Le `sort order` de la requête n'est pas spécifié → **non-déterministe**.

**Impact** : Faux positifs de matching. Un scrutin sur l'amendement n°42 du dossier A peut être lié à l'amendement n°42 du dossier B.

**Suggestion** :

- Ne pas matcher du tout quand `candidates.length > 1` (éviter les faux positifs)
- Ou implémenter le `texteLegislatifRef` matching mentionné dans le TODO ligne 157

---

### WARN-3 · Composant `AmendmentCard.tsx` dupliqué et mort

Deux `AmendmentCard` coexistent :

- `apps/frontend/src/components/AmendmentCard.tsx` — **non utilisé en production** (importé seulement par son propre test)
- `apps/frontend/src/components/scrutin/AmendmentCard.tsx` — utilisé par `routes/scrutin/$id.tsx`

Le composant mort :

- Utilise `dyn/17` (correct) vs `dyn/16` (incorrect) dans le composant actif
- A un design différent (card simple vs accordéon)
- A 14 tests qui ne testent pas le comportement réel

**Correction** : Supprimer `components/AmendmentCard.tsx` et `components/AmendmentCard.test.tsx`, ou les fusionner.

---

### WARN-4 · `confidence` stockée comme string au lieu de number

**Fichier** : `packages/etl/src/matcher.ts:133,170`

```typescript
confidence: String(config.dossierRefConfidence),  // "0.95"
confidence: String(config.titreConfidence),        // "0.80"
```

Le schéma DB déclare `decimal("confidence", { precision: 3, scale: 2 })`. PostgreSQL tolère l'insertion d'une string et la caste implicitement, donc ça fonctionne, mais c'est fragile.

**Correction** : Passer directement le nombre (Drizzle accepte `number` pour les colonnes `decimal`).

---

## 🟡 SUGGESTIONS

### SUGG-1 · Pas de tests ETL pour le parser d'amendements

Contrairement à `parser/deputies.test.ts` et `parser/scrutins.test.ts`, aucun test n'existe pour `parser/amendments.ts`. Fonctions non testées :

- `parseAmendment()` — parsing HTML → texte, gestion des champs absents
- `stripHtml()` — entités HTML, tags imbriqués, edge cases
- `parseAuteurs()` — tableau vide, auteur unique, multiples
- `extractAmendmentsJsonFromZip()` — pas d'entrées, symlinks, structure de chemin invalide

### SUGG-2 · Pas de tests d'intégration backend pour le champ `amendment`

Le fichier `scrutins.integration.test.ts` teste `getWithDetails` (themes, groupVotes) mais ne vérifie pas la présence/absence du champ `amendment`. Aucun test ne vérifie que `amendment: null` est renvoyé quand pas de match, ni que les champs sont corrects quand un match existe.

### SUGG-3 · Accessibilité : `AmendmentMeta` — `aria-label` redondant

```tsx
<span aria-label={parts.join(" · ")}>{parts.join(" · ")}</span>
```

Le `aria-label` duplique exactement le contenu texte visible. Un `aria-label` n'est utile que s'il apporte une information supplémentaire par rapport au texte visible. Ici, il peut être supprimé.

### SUGG-4 · Bouton "Lire la suite" sans `aria-expanded`

```tsx
<button onClick={() => setExpanded(true)} aria-label="Lire la suite du texte de l'amendement">
```

Après expansion, l'état du bouton n'est pas communiqué aux technologies d'assistance. Ajouter `aria-expanded={expanded}`.

### SUGG-5 · `formatTitle()` appliqué au `dispositif` dans l'ancien composant

Dans `components/AmendmentCard.tsx:37` (mort, mais à noter) :

```typescript
{
  formatTitle(amendment.dispositif);
}
```

`formatTitle` met juste la première lettre en majuscule, ce qui est inutile (et potentiellement incorrect) pour un texte législatif déjà formaté. Le composant scrutin actif ne fait pas cette erreur.

---

## 📊 MATRICE DE COUVERTURE

| Couche   | Composant                                  | Tests ?                 | Couverture            |
| -------- | ------------------------------------------ | ----------------------- | --------------------- |
| ETL      | `parser/amendments.ts`                     | ❌ Aucun                | 0%                    |
| ETL      | `matcher.ts`                               | ❌ Aucun                | 0%                    |
| ETL      | `loader.ts` → `loadAmendments()`           | ❌ Aucun                | 0%                    |
| Backend  | `routes.ts` → `AmendmentSchema`            | ❌ Aucun test dédié     | 0%                    |
| Backend  | `repository.ts` → jointure amendment       | ❌ Pas dans intégration | 0%                    |
| Frontend | `scrutin/AmendmentCard.tsx`                | ❌ Aucun                | 0%                    |
| Frontend | `components/AmendmentCard.tsx`             | ✅ 14 tests             | ~90% (composant mort) |
| Frontend | `routes/scrutin/$id.tsx` → rendu amendment | ❌ Pas de test de rendu | 0%                    |
| Frontend | `api-types.ts` → `Amendment`               | ✅ Typage statique      | N/A                   |

---

## 🔒 AUDIT SÉCURITÉ

| Risque                                                    | Fichier                                     | Statut                                                  |
| --------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| Injection HTML dans `dispositif`/`exposeSommaire`         | `amendments.ts:stripHtml()`                 | ✅ OK — strip les tags                                  |
| Path traversal dans le zip                                | `safe-zip-path.ts`                          | ✅ OK — `resolveSafeZipEntryPath`                       |
| Zip bomb                                                  | `config.ts` → `downloadMaxSizeBytes: 500MB` | ✅ OK — limite en place                                 |
| Entités HTML non décodées → XSS                           | `amendments.ts:stripHtml()`                 | ✅ OK — décode toutes les entités                       |
| URL injection dans `buildAssembleeUrl`                    | `scrutin/AmendmentCard.tsx:21`              | ⚠️ Faible risque — IDs AN format `AMANR5L17...`         |
| `auteurs` JSONB → potentiel XSS si rendu sans échappement | `scrutin/AmendmentCard.tsx:72`              | ⚠️ React échappe par défaut, mais type mismatch (BUG-2) |

---

## 📋 CHECKLIST DE VALIDATION

### Avant mise en production

- [ ] **BUG-1** : Corriger `dyn/16` → `dyn/17` dans `buildAssembleeUrl()`
- [ ] **BUG-2** : Résoudre le type mismatch `auteurs` (backend JSONB vs frontend string)
- [ ] **BUG-3** : Écrire les tests pour `scrutin/AmendmentCard.tsx`
- [ ] **WARN-1** : Matcher les amendements rectifiés (suffixe)
- [ ] **WARN-3** : Supprimer le composant `AmendmentCard.tsx` mort

### Avant v1.1

- [ ] **BUG-4** : Ajouter `article_titre` en base + ETL + API, ou supprimer du type frontend
- [ ] **WARN-2** : Remplacer le fallback Phase 2 par un vrai matching texte ou ne pas matcher
- [ ] **WARN-4** : Passer `confidence` en `number`
- [ ] **SUGG-1** : Ajouter les tests ETL parser amendements
- [ ] **SUGG-2** : Ajouter les tests d'intégration backend pour le champ `amendment`

---

## 🎯 Recommandation globale

**⚠️ SHIP WITH RESERVATIONS** — La feature fonctionne sur le happy path mais :

1. Le lien AN pointe vers la mauvaise législature (**BUG-1**)
2. Le champ `auteurs` sera probablement affiché comme `[object Object]` (**BUG-2**)
3. Les amendements rectifiés ne seront pas matchés (**WARN-1**)

Ces trois points devraient être corrigés avant déploiement. Les autres warnings et suggestions peuvent être traités en follow-up.
