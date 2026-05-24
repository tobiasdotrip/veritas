# Avis Technique — Associer le texte des amendements aux scrutins

**Rôle :** Tech Lead
**Date :** 2026-05-24
**Statut :** ✅ Faisable — recommandation GO avec phasage

---

## 1. Viabilité du matching par parsing du titre

### Pattern identifiés dans les 6 902 scrutins

| Type de titre                                | Nombre | %     |
| -------------------------------------------- | ------ | ----- |
| `l'amendement n° X ...`                      | 5 146  | 74.6% |
| `l'article ...`                              | 740    | 10.7% |
| `le sous-amendement n° X ...`                | 518    | 7.5%  |
| `l'amendement de suppression n° X ...`       | 169    | 2.4%  |
| Autres (motions, propositions, déclarations) | 329    | 4.8%  |

### Regex de matching

```regex
/(?:l'amendement|le sous-amendement|l'amendement de suppression)\s+n[°o]\s*(\d+)(?:\s*\(rect\.\))?/i
```

- **Taux de couverture estimé : ~85%** des scrutins (5 833 / 6 902) contiennent un n° d'amendement identifiable
- Les 740 scrutins "article" ne matchent pas → pas d'amendement de référence → pas de texte à afficher (OK, ce sont des votes sur l'article entier)

### Edge cases identifiés

| Problème                                                                                                                        | Gravité     | Solution                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Numéros non uniques** : amendement n°1 apparaît 57 fois dans des textes différents                                            | 🔴 Bloquant | Nécessite un matching composite : `n° amendement` + `dossier législatif` (déduit du titre ou d'une référence dans le JSON scrutin) |
| **`(rect.)`** dans le numéro : `n° 297 (rect.)`                                                                                 | 🟡 Mineur   | Strip `(rect.)` avant matching                                                                                                     |
| **Sous-amendements pointant vers un amendement parent** : `le sous-amendement n° 202 ... à l'amendement n° 171`                 | 🟡 Mineur   | Extraire les 2 numéros ; le sous-amendement peut ne pas exister dans le dataset si le parent n'a pas été modifié                   |
| **Amendements identiques groupés** : `l'amendement n° 444 (rect.) ... et les amendements identiques suivants`                   | 🟡 Mineur   | Le scrutin peut correspondre à plusieurs amendements ; afficher le principal + lien vers les identiques                            |
| **Pas de `dossierLegislatif` dans le scrutin JSON** : le champ `objet.dossierLegislatif` est `null` dans l'échantillon inspecté | 🟠 Moyen    | Fallback : déduire le dossier depuis le nom du texte dans le titre via fuzzy matching                                              |

### Conclusion matching

✅ **Faisable mais pas trivial.** Le matching composite (numéro + contexte législatif) couvre ~80% des scrutins. Les ~20% restants (articles, motions) ne sont pas concernés par cette feature.

---

## 2. Nouvelle table `amendments` vs enrichir `scrutins`

### Recommandation : **table dédiée `amendments`**

| Critère                  | `amendments` (nouvelle table)                                                | Colonne JSON dans `scrutins`          |
| ------------------------ | ---------------------------------------------------------------------------- | ------------------------------------- |
| Volume de données        | 1 amendement = ~5-15 KB de texte                                             | Même volume, mais dans chaque scrutin |
| Recherche full-text      | ✅ pg_trgm déjà en place, indexable                                          | ❌ Plus lent (JSON imbriqué)          |
| Réutilisabilité          | Un amendement peut être lié à plusieurs scrutins (amendements identiques)    | Duplication                           |
| Maintenance              | Migration simple, rollback facile                                            | Colonne lourde, difficile à nettoyer  |
| Cohésion avec l'existant | Pattern déjà utilisé : `scrutin_themes`, `scrutin_votes` (tables de liaison) | Va contre les patterns existants      |

### Schéma proposé

```sql
CREATE TABLE amendments (
  id          varchar(100) PRIMARY KEY,      -- AMANR5L17PO838901BTC1364P0D1N000613
  numero      integer NOT NULL,               -- 613
  dossier_ref varchar(50),                    -- DLR5L17N51670
  texte_ref   varchar(50),                    -- PIONANR5L17BTC1364
  article_ref varchar(100),                   -- "article 10"
  contenu     text,                           -- texte intégral de l'amendement
  expose      text,                           -- exposé des motifs
  auteurs     text,                           -- noms des auteurs
  sort        varchar(50),                    -- "adopté", "rejeté", "retiré", etc.
  created_at  timestamp DEFAULT now()
);

CREATE TABLE scrutin_amendments (
  id            serial PRIMARY KEY,
  scrutin_id    varchar(50) REFERENCES scrutins(id) ON DELETE CASCADE,
  amendment_id  varchar(100) REFERENCES amendments(id) ON DELETE CASCADE,
  match_source  varchar(20) NOT NULL DEFAULT 'parsing',  -- 'parsing' | 'manual'
  UNIQUE(scrutin_id, amendment_id)
);
```

---

## 3. Impact sur l'ETL existant

### Nouveau step ETL proposé : `Step 2.5 — Amendements`

```typescript
// → Après Organes (step 2), avant ou après Scrutins (step 3)
console.log("[etl] Step 2.5/4: Amendments");
const amendResult = await downloadZip(
  config.urls.amendments,
  resolve(config.tempDir, "amendments.zip"),
  config,
);
// Streaming parse du zip (pas d'extraction complète)
const amendIter = parseAmendmentsFromZip(amendResult.filePath);
result.amendments = await loadAmendments(deps, amendIter, config);
```

### Métriques estimées

| Métrique                    | Valeur                                                |
| --------------------------- | ----------------------------------------------------- |
| Taille du zip               | **272 MB**                                            |
| Temps de download           | ~2-5 min (dépend de la connexion)                     |
| Nombre d'amendements estimé | ~50 000 - 100 000                                     |
| Temps de parsing            | ~5-10 min (format JSON → beaucoup de petits fichiers) |
| Impact DB                   | +~200-500 MB (texte intégral)                         |
| Temps ETL total             | Actuel ~15 min → ~25-35 min avec amendements          |

### Stratégie d'optimisation

- **Streaming** : pas d'extraction complète du zip, lecture fichier par fichier comme pour les scrutins
- **ETag-based skip** : comme les autres étapes, skip si le hash n'a pas changé
- **Matching différé** : le matching scrutin↔amendement peut être fait en step 4 (post-load), pas pendant le parsing
- **Batch insert** : même pattern que `loadScrutins`, par lot de 100

---

## 4. Risques d'intégration

| Risque                                                       | Probabilité | Impact | Mitigation                                                                                                                                                     |
| ------------------------------------------------------------ | ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Changement de format du zip amendements**                  | Moyenne     | Haut   | Les paths incluent des IDs AN (ex: `DLR5L17N51670`) ; un changement de structure serait visible rapidement. Prévoir un test d'intégrité au démarrage de l'ETL. |
| **Matching incorrect** (mauvais amendement lié)              | Moyenne     | Moyen  | Ajouter une colonne `match_confidence` + loguer les matchs ambigus pour review humaine.                                                                        |
| **Explosion du volume DB**                                   | Basse       | Moyen  | 50K amendements × ~3KB texte = ~150 MB. Gérable. Si problème, tronquer `expose` à 2000 caractères.                                                             |
| **Temps ETL trop long**                                      | Basse       | Bas    | L'ETL tourne en cron (pas en temps réel). L'utilisateur n'attend pas.                                                                                          |
| **Amendements non trouvables** (scrutin "article" ou motion) | Haute       | Bas    | ~15% des scrutins. UX : ne pas afficher de section "amendement" si pas de match. Pas un bug.                                                                   |

---

## 5. Recommandation d'architecture

### Approche hybride : Full-text + Lien hypertexte

```
┌──────────────────────────────────────────────────────┐
│  Page scrutin                                        │
│                                                      │
│  Titre : "l'amendement n° 338 de Mme Trouvé..."      │
│                                                      │
│  ┌─ Texte de l'amendement ─────────────────────────┐ │
│  │                                                  │ │
│  │  [contenu] Après l'alinéa 5, insérer l'alinéa   │ │
│  │  suivant : "Les dispositions du présent          │ │
│  │  article s'appliquent..."                        │ │
│  │                                                  │ │
│  │  📎 Voir sur le site de l'Assemblée Nationale    │ │
│  │     → lien: https://www.assemblee-nationale.fr/  │ │
│  │       dyn/16/amendements/...                     │ │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─ Exposé des motifs ─────────────────────────────┐ │
│  │  [expose] Cet amendement vise à...               │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Pourquoi pas "lien uniquement" ?** L'utilisateur a dit explicitement qu'il ne veut pas faire une "2ème recherche". Un lien externe force à quitter Veritas → expérience dégradée.

**Pourquoi pas "full-text uniquement" ?** Le lien officiel AN reste utile pour vérifier la source et voir le contexte complet (débats, autres amendements).

---

## 6. Plan de mise en œuvre (ordre de priorité)

### Phase 1 — Fondations (2-3 jours)

1. **Migration DB** : créer `amendments` + `scrutin_amendments`
2. **Parser ETL** : `parser/amendments.ts` — streaming parse du zip amendements
3. **Loader ETL** : `loadAmendments()` dans `loader.ts`
4. **Config** : ajouter `ETL_URL_AMENDMENTS` dans `.env` et `config.ts`

### Phase 2 — Matching (1-2 jours)

5. **Module matching** : `packages/etl/src/matcher.ts` — extrait n° amendement + contexte du titre scrutin, query la table `amendments`
6. **Step ETL matching** : exécuté après le load des scrutins et amendements
7. **Tests** : cas de matching (rect., sous-amendement, amendements identiques)

### Phase 3 — API + Frontend (1-2 jours)

8. **Repository** : enrichir `ScrutinRepository.getWithDetails()` avec les amendements liés
9. **API** : enrichir `GET /scrutins/:id` → ajouter `amendments: [{ id, numero, contenu, expose, auteurs, sort, lien_an }]`
10. **Frontend** : composant `AmendmentCard` affiché sous le titre du scrutin

### Phase 4 — Polish (optionnel)

11. Lien AN auto-généré depuis l'ID amendement
12. Cache Redis pour les textes d'amendements (TTL 24h)
13. Fallback lien AN pour les scrutins sans amendement matché

---

## Verdict

✅ **GO — Feature faisable, architecture claire, priorité moyenne-haute.**

L'impact principal est le temps de développement (4-7 jours) et le téléchargement additionnel de 272 MB dans l'ETL. Le bénéfice utilisateur est fort : 85% des scrutins gagnent un contexte immédiat sans recherche externe.

**Recommandation : commencer par la Phase 1 dès maintenant.** Les fondations (table + parser + loader) sont indépendantes et non-bloquantes. Le matching (Phase 2) est le point le plus délicat et mérite un spike dédié.
