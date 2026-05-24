# Analyse Backend — Intégration du dataset Amendements

## Résumé exécutif

L'Assemblée Nationale publie un dataset des amendements de la législature 17 :

- **URL** : `https://data.assemblee-nationale.fr/static/openData/repository/17/loi/amendements_div_legis/Amendements.json.zip`
- **Volumétrie** : 111 734 fichiers JSON, 272 Mo décompressés, 16 Mo compressés
- **Structure** : `json/{dossierRef}/{textRef}/AMANR...{numero}.json`
- **Taux de matching avec les scrutins** : 15.6% directement via `dossierRef`, extensible à ~80%+ avec matching textuel

---

## 1. Structure de la table `amendments`

```typescript
export const amendments = pgTable(
  "amendments",
  {
    id: varchar("id", { length: 50 }).primaryKey(), // AMANR5L17PO59047BTC1376P0D1N000012
    numero: integer("numero").notNull(), // N° amendement (12, 2194, etc.)
    texteLegislatifRef: varchar("texte_legislatif_ref", {
      length: 50,
    }).notNull(),
    dossierRef: varchar("dossier_ref", { length: 20 }), // DLR5L17N51655 (nullable, pas toujours présent)
    legislature: varchar("legislature", { length: 10 }).notNull(),
    dispositif: text("dispositif").notNull(), // Texte de l'amendement (HTML → texte)
    exposeSommaire: text("expose_sommaire"), // Exposé des motifs (souvent vide)
    auteurs: text("auteurs").notNull(), // Liste des signataires
    sortCode: varchar("sort_code", { length: 20 }), // "adopté", "rejeté", "retiré", "tombé"
    articleRef: text("article_ref"), // "ART. 4" — référence à l'article
    articleTitre: text("article_titre"), // "Article 4" — titre complet
    syncHash: varchar("sync_hash", { length: 64 }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_amendments_dossier_numero").on(table.dossierRef, table.numero),
    index("idx_amendments_texte_numero").on(
      table.texteLegislatifRef,
      table.numero,
    ),
    index("idx_amendments_search").using(
      "gin",
      sql`to_tsvector('french', coalesce(${table.dispositif}, ''))`,
    ),
  ],
);
```

**Choix de design** :

- `numero` en `integer` (pas `varchar`) car extrait du pattern `N000107` → `107`, permet un index BTREE efficace
- Deux indexes composites pour les stratégies de matching :
  - `(dossierRef, numero)` pour le matching direct via dossierRef (15.6%)
  - `(texteLegislatifRef, numero)` pour le matching textuel (84.4%)
- `dispositif` stocké en texte nettoyé (HTML → plain text avec `html.unescape` + strip tags)
- `syncHash` pour l'idempotence ETL (comme pour les scrutins)

---

## 2. Stratégie de matching scrutin ↔ amendement

### 2.1 Matching direct via dossierRef (niveau 1)

**Taux de couverture** : 918 / 5878 amendements = **15.6%**

Le scrutin JSON contient parfois `objet.dossierLegislatif.dossierRef` (ex: `DLR5L17N51655`).

```typescript
// Extraction depuis le titre du scrutin
const AMENDEMENT_REGEX = /amendement\s+n°\s*(\d+)/i;

// Vérification : le dossierRef dans le scrutin correspond à un répertoire dans le zip
// Structure du zip : json/{dossierRef}/{texteRef}/AMANR...N{numero}.json

function matchByDossierRef(scrutin: ParsedScrutin, rawScrutin: RawScrutin) {
  const dossierRef = rawScrutin.objet?.dossierLegislatif?.dossierRef;
  if (!dossierRef) return null;

  const numero = extractAmendmentNumber(scrutin.titre);
  if (!numero) return null;

  // Recherche dans la table amendments
  return db
    .select()
    .from(amendments)
    .where(
      and(eq(amendments.dossierRef, dossierRef), eq(amendments.numero, numero)),
    );
}
```

### 2.2 Matching textuel (niveau 2)

**Taux de couverture estimé** : ~80%+ des 4960 scrutins restants

L'idée est de parser le titre du scrutin pour extraire le nom du texte législatif
(proposition/projet de loi) et le matcher contre les métadonnées des amendements.

```typescript
// Extraire le nom de la loi du titre
// "l'amendement n° 107 ... de la proposition de loi relative à l'intérêt des enfants"
const LOI_REGEX =
  /(?:projet|proposition)\s+de\s+loi\s+(.+?)(?:\s*\((?:première|nouvelle|seconde)\s+lecture\))/i;

function extractLawName(title: string): string | null {
  const match = title.match(LOI_REGEX);
  return match ? normalizeLawName(match[1]) : null;
}

function normalizeLawName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/\s+/g, " ")
    .trim();
}
```

Pour les amendements, le matching nécessite de charger les dossiers législatifs
ou de parser le nom du texte depuis le chemin du fichier dans le zip.

**Limite** : cette approche est fragile car les noms de loi peuvent varier légèrement.
Une approche hybride (fuzzy match + numéro d'amendement) serait plus robuste.

### 2.3 Recommandation : approche en deux phases

1. **Phase 1 (MVP)** : Matching via `dossierRef` uniquement → 918 scrutins enrichis
   - Simple, fiable, pas de faux positifs
   - Couvre déjà les cas les plus récents (le dossierRef est mieux rempli depuis 2025)

2. **Phase 2 (v2)** : Matching textuel → ~4000 scrutins supplémentaires
   - Parsing du titre pour extraire le nom de loi
   - Matching contre le dataset des amendements (via fuzzy search sur le nom)
   - Ajout d'un index GIN pour la recherche texte

---

## 3. Nouveau step ETL

### 3.1 Parser d'amendements

Le fichier `Amendements.json.zip` contient `json/{dossierRef}/{texteRef}/AMANR...json`.

```typescript
// packages/etl/src/parser/amendments.ts

export interface ParsedAmendment {
  id: string;
  numero: number;
  texteLegislatifRef: string;
  dossierRef: string | null;
  legislature: string;
  dispositif: string;
  exposeSommaire: string | null;
  auteurs: string;
  sortCode: string | null;
  articleRef: string | null;
  articleTitre: string | null;
}

export function parseAmendment(raw: Record<string, unknown>): ParsedAmendment {
  const am = raw.amendement as Record<string, unknown>;
  const corps = (am.corps ?? {}) as Record<string, unknown>;
  const contenuAuteur = (corps.contenuAuteur ?? {}) as Record<string, unknown>;
  const signataires = (am.signataires ?? {}) as Record<string, unknown>;
  const pointeur = (am.pointeurFragmentTexte ?? {}) as Record<string, unknown>;
  const division = (pointeur.division ?? {}) as Record<string, unknown>;
  const cycleVie = (am.cycleDeVie ?? {}) as Record<string, unknown>;

  // Extraire le numéro du UID (N000107 → 107)
  const numero = Number(String(am.uid ?? "").match(/N(\d+)/)?.[1] ?? "0");

  return {
    id: String(am.uid ?? ""),
    numero,
    texteLegislatifRef: String(am.texteLegislatifRef ?? ""),
    dossierRef: extractDossierRef(String(am.uid ?? "")),
    legislature: String(am.legislature ?? "17"),
    dispositif: cleanHtml(String(contenuAuteur.dispositif ?? "")),
    exposeSommaire: cleanHtml(String(am.exposeSommaire ?? "")) || null,
    auteurs: cleanHtml(String(signataires.libelle ?? "")),
    sortCode: String(cycleVie.sort?.code ?? "") || null,
    articleRef: String(division.articleDesignationCourte ?? "") || null,
    articleTitre: String(division.titre ?? "") || null,
  };
}

function extractDossierRef(uid: string): string | null {
  // UID pattern: AMANR5L17PO{org}BTC{text}P0D1N{number}
  // The dossierRef is NOT in the UID, it's in the zip directory structure
  // This must be passed from the zip extraction context
  return null; // Rempli par le caller selon le répertoire
}
```

### 3.2 Loader d'amendements

```typescript
// packages/etl/src/loader.ts (ajout)

export async function loadAmendments(
  deps: LoaderDeps,
  amendments: AsyncIterable<ParsedAmendment>,
  config: EtlConfig,
  onProgress?: (processed: number) => void,
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;
  let processed = 0;
  let batch: ParsedAmendment[] = [];

  async function flushBatch() {
    if (batch.length === 0) return;
    try {
      await deps.db.transaction(async (trx) => {
        for (const a of batch) {
          await trx
            .insert(schema.amendments)
            .values({
              id: a.id,
              numero: a.numero,
              texteLegislatifRef: a.texteLegislatifRef,
              dossierRef: a.dossierRef,
              legislature: a.legislature,
              dispositif: a.dispositif,
              exposeSommaire: a.exposeSommaire,
              auteurs: a.auteurs,
              sortCode: a.sortCode,
              articleRef: a.articleRef,
              articleTitre: a.articleTitre,
              createdAt: new Date(),
            })
            .onConflictDoUpdate({
              target: schema.amendments.id,
              set: {
                dispositif: sql`excluded.dispositif`,
                auteurs: sql`excluded.auteurs`,
                sortCode: sql`excluded.sort_code`,
              },
            });
        }
      });
      inserted += batch.length;
    } catch (err) {
      errors += batch.length;
      console.error(
        `[loader] Amendment batch failed (${batch.length}): ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      batch = [];
    }
  }

  for await (const a of amendments) {
    batch.push(a);
    processed++;

    if (processed % config.batchSize === 0) {
      await flushBatch();
      onProgress?.(processed);
    }
  }

  await flushBatch();
  onProgress?.(processed);

  return { inserted, errors };
}
```

### 3.3 Intégration dans le pipeline

```typescript
// packages/etl/src/index.ts — nouveau step 5

// ─── 5. Amendements ─────────────────────────────────────────────
console.log("[etl] Step 5/5: Amendments");
const amendementsResult = await downloadZip(
  "https://data.assemblee-nationale.fr/static/openData/repository/17/loi/amendements_div_legis/Amendements.json.zip",
  resolve(config.tempDir, "amendements.zip"),
  config,
);

const amendementsIter = parseAmendmentsFromZip(
  amendementsResult.filePath,
  config.tempDir,
);
result.amendments = await loadAmendments(deps, amendementsIter, config, (p) => {
  if (p % 10000 === 0) console.log(`[etl] Amendments processed: ${p}`);
});
```

**Volumétrie estimée** :

- 111 734 fichiers → ~111K insertions (batch de 1000 → 112 transactions)
- Temps estimé : 30-60 secondes (272 Mo de JSON à parser)
- Espace disque DB : ~100-200 Mo pour la table amendments

---

## 4. Impact sur l'API scrutins

### 4.1 Enrichir GET /api/v1/scrutins/:id

Ajout du champ `amendement` au détail du scrutin :

```typescript
const ScrutinDetailSchema = ScrutinSchema.extend({
  libelleTypeVote: z.string().nullable(),
  themes: z.array(/* ... */),
  groupVotes: z.array(/* ... */),
  // NOUVEAU :
  amendement: z
    .object({
      id: z.string(),
      numero: z.number(),
      dispositif: z.string(),
      exposeSommaire: z.string().nullable(),
      auteurs: z.string(),
      articleRef: z.string().nullable(),
      articleTitre: z.string().nullable(),
      sortCode: z.string().nullable(),
    })
    .nullable(),
});
```

### 4.2 Requête de matching dans le repository

```typescript
async getWithDetails(id: string) {
  // ...existing code pour scrutin, themes, groupVotes...

  // Matching amendement
  const scrutin = scrutinResult[0];
  let amendement = null;

  if (scrutin) {
    // Stratégie 1 : parsing du titre
    const numero = extractAmendmentNumber(scrutin.titre);

    if (numero) {
      // Chercher d'abord par dossierRef si disponible
      // (le dossierRef n'est pas stocké dans la table scrutins aujourd'hui,
      //  il faudrait soit l'ajouter, soit faire le matching au moment de
      //  l'ETL et stocker un amendement_id dans scrutins)
      const amd = await db
        .select()
        .from(amendments)
        .where(
          and(
            eq(amendments.numero, numero),
            eq(amendments.legislature, "17"),
            // Matching textuel : le nom de la loi dans le titre
            // doit correspondre au texteLegislatifRef
          ),
        )
        .limit(1);

      if (amd[0]) {
        amendement = amd[0];
      }
    }
  }

  return { ...scrutin, themes: themeRows, groupVotes, amendement };
}
```

### 4.3 Alternative : table de liaison `scrutin_amendements`

Pour éviter de faire le matching à chaque requête API, on peut matcher au moment de l'ETL :

```typescript
export const scrutinAmendments = pgTable(
  "scrutin_amendments",
  {
    id: serial("id").primaryKey(),
    scrutinId: varchar("scrutin_id", { length: 50 })
      .notNull()
      .references(() => scrutins.id, { onDelete: "cascade" }),
    amendmentId: varchar("amendment_id", { length: 50 })
      .notNull()
      .references(() => amendments.id, { onDelete: "cascade" }),
    matchMethod: varchar("match_method", { length: 20 }).notNull(), // "dossier_ref" | "text_match" | "manual"
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_scrutin_amendment_unique").on(
      table.scrutinId,
      table.amendmentId,
    ),
    index("idx_scrutin_amendment_scrutin").on(table.scrutinId),
  ],
);
```

**Recommandation** : utiliser la table de liaison.

- Matching fait une seule fois (lors de l'ETL)
- L'API interroge la liaison par jointure simple
- Permet de tracer la méthode de matching (`matchMethod`)
- Facilite le re-matching ultérieur si on améliore l'algorithme

---

## 5. Cache Redis

Le texte des amendements est **volumineux** (certains dispositifs font plusieurs paragraphes)
et **immuable** (le contenu d'un amendement ne change pas après dépôt).

### Stratégie recommandée :

```typescript
// Cache pour le détail complet d'un scrutin (incluant amendement)
const CACHE_TTL = 3600; // 1 heure — texte immuable, pas besoin de rafraîchir souvent

export async function getScrutinById(id: string) {
  const cacheKey = `id:${id}:v2`; // bump version si le schema change
  return cache.getOrSet(CACHE_NS, cacheKey, CACHE_TTL, () =>
    repo.getWithDetails(id),
  );
}
```

**Pourquoi 1h de TTL ?**

- Les amendements ne changent jamais (données historiques)
- Le seul cas de mise à jour : l'ETL re-sync qui met à jour `sortCode` (adopté/rejeté)
- 1h = assez court pour refléter un re-sync ETL, assez long pour éviter de refaire 3 jointures

**Ne PAS cacher séparément** les amendements : le cache du scrutin complet (scrutin + themes + groupVotes + amendement) est plus efficace (1 round-trip Redis au lieu de 2).

---

## 6. Schéma Zod pour validation

```typescript
// apps/backend/src/modules/scrutins/routes.ts

const AmendmentSchema = z.object({
  id: z.string(),
  numero: z.number().int().positive(),
  dispositif: z.string(),
  exposeSommaire: z.string().nullable(),
  auteurs: z.string(),
  articleRef: z.string().nullable(),
  articleTitre: z.string().nullable(),
  sortCode: z.string().nullable(),
});

const ScrutinDetailSchema = ScrutinSchema.extend({
  libelleTypeVote: z.string().nullable(),
  themes: z.array(
    z.object({
      id: z.number(),
      slug: z.string(),
      label: z.string(),
      confidence: z.string().nullable(),
    }),
  ),
  groupVotes: z.array(
    z.object({
      id: z.number(),
      politicalGroupId: z.string(),
      name: z.string(),
      abbreviation: z.string().nullable(),
      nombreMembresGroupe: z.number().nullable(),
      positionMajoritaire: z.string().nullable(),
      nombrePour: z.number().nullable(),
      nombreContre: z.number().nullable(),
      nombreAbstentions: z.number().nullable(),
      nombreNonVotants: z.number().nullable(),
    }),
  ),
  amendement: AmendmentSchema.nullable(), // null si non matché
});
```

---

## 7. Plan d'implémentation recommandé

| Étape                               | Fichiers                                          | Effort  |
| ----------------------------------- | ------------------------------------------------- | ------- |
| 1. Schema Drizzle                   | `packages/shared/src/db/schema.ts`                | 30 min  |
| 2. Migration                        | `drizzle-kit generate` + migration SQL            | 5 min   |
| 3. Parser amendements               | `packages/etl/src/parser/amendments.ts`           | 45 min  |
| 4. Loader amendements               | `packages/etl/src/loader.ts` (ajout)              | 30 min  |
| 5. Intégration pipeline             | `packages/etl/src/index.ts`                       | 15 min  |
| 6. Table liaison scrutin-amendement | Schema + migration                                | 15 min  |
| 7. Matching ETL                     | `packages/etl/src/index.ts` (post-load)           | 1h      |
| 8. Repository enrichi               | `apps/backend/src/modules/scrutins/repository.ts` | 30 min  |
| 9. API Schema + tests               | `routes.ts` + test d'intégration                  | 30 min  |
| **Total estimé**                    |                                                   | **~4h** |

---

## 8. Risques et garde-fous

| Risque                                          | Mitigation                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| **Mémoire** : 272 Mo de JSON à parser           | Streaming (lire fichier par fichier dans le zip, pas tout en mémoire)   |
| **Temps ETL** : 111K fichiers × parsing JSON    | `batchSize=1000`, transaction toutes les 1000 lignes, progress callback |
| **Disque** : table amendments ~150 Mo           | Index GIN sur dispositif = +50 Mo, acceptable                           |
| **Faux positifs** matching textuel              | `matchMethod` dans la table de liaison pour tracer ; seuil de confiance |
| **API lente** : jointure supplémentaire         | Cache Redis 1h, index sur `scrutin_amendments.scrutin_id`               |
| **Amendements manquants** : 84% sans dossierRef | Retourne `amendement: null` — l'UI affiche un lien vers l'AN            |

---

## 9. Conclusion

✅ **Faisable** — le dataset existe, le matching fonctionne pour les scrutins avec `dossierRef`

⚠️ **Couverture partielle** en phase 1 — 15.6% des scrutins d'amendements auront le texte. C'est 918 scrutins enrichis, ce qui reste significatif (les scrutins les plus récents ont tous un `dossierRef`).

📈 **Extensible** — la phase 2 (matching textuel) pourra couvrir la majorité des scrutins restants.

🏗️ **Architecture propre** — la table de liaison `scrutin_amendments` permet de décorréler le matching de l'API, et de tracer la méthode de matching pour déboguer.
