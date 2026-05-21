# Rapport Technique Backend — Transparence des Votes des Députés

**Date** : 2026-05-20  
**Version** : 1.1  
**Stack** : Fastify 5 + TypeScript + PostgreSQL 17 + Drizzle 0.45 + Zod 4 + Redis 8  
**Scope** : MVP (Assemblée Nationale, législature courante)  
**Implémentation** : [ETAT_PROJET.md](../ETAT_PROJET.md)  

---

## 1. Résumé exécutif

Ce document définit l'architecture backend complète pour la plateforme de transparence des votes parlementaires. Il couvre :

- **Schéma de données Drizzle ORM** normalisé pour les députés, scrutins, votes individuels et groupes politiques
- **API REST Fastify** avec validation Zod, pagination curseur, et enveloppe de réponse standardisée
- **Pipeline ETL** idempotent pour l'ingestion quotidienne des ZIP JSON de `data.assemblee-nationale.fr`
- **Requêtes SQL optimisées** pour les 5 cas d'usage critiques (recherche, historique, détail, comparaison, indicateurs)
- **Stratégie de cache Redis** avec invalidation par génération pour éviter le SCAN massif
- **Structure de projet modulaire** séparant routes, services, repositories et cross-cutting concerns

**Hypothèses de volume (17e législature)** :
- ~580 scrutins/an → ~3 500 scrutins sur la législature
- ~577 députés
- ~3,3 M votes individuels
- ZIP quotidien : ~80–120 Mo compressé, ~400 Mo en JSON

---

## 2. Analyse des sources de données

### 2.1. Source primaire : Assemblée Nationale

L'AN ne fournit pas d'API REST paginée mais des **archives ZIP complètes** mises à jour quotidiennement.

| Ressource | URL modèle | Format |
|-----------|------------|--------|
| Scrutins (votes) | `https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip` | ZIP + JSON |
| Députés acteurs | `https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs/AMO10_deputes_actifs.json.zip` | ZIP + JSON |
| Organes (groupes) | `https://data.assemblee-nationale.fr/static/openData/repository/17/amo/organe/AMO20_organe.json.zip` | ZIP + JSON |

**Structure des votes (JSON)** :
- Racine : `scrutins.scrutin[]`
- Chaque scrutin contient `ventilationVotes.organe.groupes.groupe[]`
- Votes nominatifs dans `vote.decompteNominatif` :
  - `pours.votant[]` → `acteurRef`, `mandatRef`, `parDelegation`
  - `contres.votant[]`
  - `abstentions.votant[]`
  - `nonVotants.votant[]` → `causePositionVote`

**Identification** : les députés sont référencés par `acteurRef` (ex: `PA1234`) et le mandat par `mandatRef` (ex: `PM5678`).

### 2.2. Source secondaire : indicateurs calculés

- **Datan.fr** publie des CSV hebdomadaires sur data.gouv.fr avec scores de participation et loyauté.
- En V1, ces indicateurs peuvent être importés en batch pour préremplir les statistiques. En production, le système recalcule ses propres indicateurs en temps réel depuis la BDD.

### 2.3. Limites du MVP

- **AN uniquement** : le Sénat n'a pas de dataset votes structuré en Open Data (hors dumps SQL lourds).
- **Législature 17** : focus sur la législature courante. Les législatures antérieures seront ajoutées via le même pipeline.
- **Thématiques** : l'AN ne fournit pas de tags thématiques. Le MVP utilisera une classification par mots-clés sur `titre` + `objet`, enrichissable manuellement.

---

## 3. Schéma de données Drizzle ORM

### 3.1. Extensions PostgreSQL requises

```sql
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
```

### 3.2. Schéma complet

```typescript
// src/db/schema.ts
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────

export const votePositionEnum = pgEnum("vote_position", [
  "pour",
  "contre",
  "abstention",
  "nonVotant",
]);

export const scrutinSortEnum = pgEnum("scrutin_sort", [
  "adopté",
  "rejeté",
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "pending",
  "running",
  "success",
  "failed",
]);

// ─── Législatures ────────────────────────────────────────────────

export const legislatures = pgTable("legislatures", {
  id: varchar("id", { length: 10 }).primaryKey(), // "17"
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Députés (Acteurs) ───────────────────────────────────────────

export const deputies = pgTable(
  "deputies",
  {
    id: varchar("id", { length: 20 }).primaryKey(), // PA1234
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    civility: varchar("civility", { length: 10 }),
    dateOfBirth: timestamp("date_of_birth", { mode: "date" }),
    placeOfBirth: varchar("place_of_birth", { length: 200 }),
    departmentId: varchar("department_id", { length: 3 }), // "075"
    circoNumber: integer("circo_number"),
    circoLabel: text("circo_label"),
    photoUrl: text("photo_url"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_deputies_name").on(table.lastName, table.firstName),
    index("idx_deputies_department").on(table.departmentId),
    index("idx_deputies_circo").on(table.departmentId, table.circoNumber),
    index("idx_deputies_search").using(
      "gin",
      sql`to_tsvector('french', coalesce(${table.lastName}, '') || ' ' || coalesce(${table.firstName}, ''))`
    ),
  ]
);

export const deputiesRelations = relations(deputies, ({ many }) => ({
  mandates: many(deputyMandates),
  affiliations: many(deputyGroupAffiliations),
  votes: many(scrutinVotes),
}));

// ─── Mandats ─────────────────────────────────────────────────────

export const deputyMandates = pgTable(
  "deputy_mandates",
  {
    id: varchar("id", { length: 20 }).primaryKey(), // PM5678
    deputyId: varchar("deputy_id", { length: 20 })
      .notNull()
      .references(() => deputies.id, { onDelete: "cascade" }),
    legislature: varchar("legislature", { length: 10 })
      .notNull()
      .references(() => legislatures.id),
    startDate: timestamp("start_date", { mode: "date" }).notNull(),
    endDate: timestamp("end_date", { mode: "date" }),
    departmentId: varchar("department_id", { length: 3 }),
    circoNumber: integer("circo_number"),
    circoLabel: text("circo_label"),
    electionCause: text("election_cause"),
    endCause: text("end_cause"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_mandates_deputy").on(table.deputyId),
    index("idx_mandates_legislature_date").on(
      table.legislature,
      table.startDate
    ),
  ]
);

export const deputyMandatesRelations = relations(
  deputyMandates,
  ({ one, many }) => ({
    deputy: one(deputies, {
      fields: [deputyMandates.deputyId],
      references: [deputies.id],
    }),
    affiliations: many(deputyGroupAffiliations),
    votes: many(scrutinVotes),
  })
);

// ─── Groupes politiques (Organes) ────────────────────────────────

export const politicalGroups = pgTable(
  "political_groups",
  {
    id: varchar("id", { length: 20 }).primaryKey(), // PO800000
    legislature: varchar("legislature", { length: 10 })
      .notNull()
      .references(() => legislatures.id),
    name: text("name").notNull(),
    abbreviation: varchar("abbreviation", { length: 20 }),
    startDate: timestamp("start_date", { mode: "date" }),
    endDate: timestamp("end_date", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_groups_legislature").on(table.legislature, table.name),
  ]
);

export const politicalGroupsRelations = relations(
  politicalGroups,
  ({ many }) => ({
    affiliations: many(deputyGroupAffiliations),
    groupVotes: many(scrutinGroupVotes),
  })
);

// ─── Affiliations député ↔ groupe ───────────────────────────────

export const deputyGroupAffiliations = pgTable(
  "deputy_group_affiliations",
  {
    id: serial("id").primaryKey(),
    deputyId: varchar("deputy_id", { length: 20 })
      .notNull()
      .references(() => deputies.id, { onDelete: "cascade" }),
    politicalGroupId: varchar("political_group_id", { length: 20 })
      .notNull()
      .references(() => politicalGroups.id, { onDelete: "cascade" }),
    mandateId: varchar("mandate_id", { length: 20 })
      .notNull()
      .references(() => deputyMandates.id, { onDelete: "cascade" }),
    startDate: timestamp("start_date", { mode: "date" }).notNull(),
    endDate: timestamp("end_date", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_affiliations_deputy_date").on(table.deputyId, table.startDate),
    index("idx_affiliations_group").on(table.politicalGroupId),
  ]
);

// ─── Scrutins ────────────────────────────────────────────────────

export const scrutins = pgTable(
  "scrutins",
  {
    id: varchar("id", { length: 50 }).primaryKey(), // VTANR5L17V1
    legislature: varchar("legislature", { length: 10 })
      .notNull()
      .references(() => legislatures.id),
    numero: integer("numero").notNull(),
    organeRef: varchar("organe_ref", { length: 20 }),
    sessionRef: varchar("session_ref", { length: 20 }),
    seanceRef: varchar("seance_ref", { length: 20 }),
    dateScrutin: timestamp("date_scrutin", { mode: "date" }).notNull(),
    quantiemeJourSeance: integer("quantieme_jour_seance"),
    codeTypeVote: varchar("code_type_vote", { length: 50 }),
    libelleTypeVote: text("libelle_type_vote"),
    typeMajorite: varchar("type_majorite", { length: 50 }),
    sortCode: scrutinSortEnum("sort_code"),
    sortLibelle: text("sort_libelle"),
    titre: text("titre").notNull(),
    demandeur: text("demandeur"),
    objet: text("objet"),
    modePublicationDesVotes: varchar("mode_publication_des_votes", {
      length: 50,
    }),
    nombreVotants: integer("nombre_votants"),
    suffragesExprimes: integer("suffrages_exprimes"),
    nombrePour: integer("nombre_pour"),
    nombreContre: integer("nombre_contre"),
    nombreAbstentions: integer("nombre_abstentions"),
    nombreNonVotants: integer("nombre_non_votants"),
    nombreNonVotantsVolontaires: integer("nombre_non_votants_volontaires"),
    syncHash: varchar("sync_hash", { length: 64 }), // SHA-256 du JSON source
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_scrutins_legislature_date").on(
      table.legislature,
      table.dateScrutin.desc()
    ),
    index("idx_scrutins_date_numero").on(
      table.dateScrutin.desc(),
      table.numero.desc()
    ),
    index("idx_scrutins_type").on(table.codeTypeVote),
    index("idx_scrutins_sort").on(table.sortCode),
    index("idx_scrutins_search").using(
      "gin",
      sql`to_tsvector('french', coalesce(${table.titre}, '') || ' ' || coalesce(${table.objet}, ''))`
    ),
  ]
);

export const scrutinsRelations = relations(scrutins, ({ many }) => ({
  votes: many(scrutinVotes),
  groupVotes: many(scrutinGroupVotes),
  themes: many(scrutinThemes),
}));

// ─── Votes par groupe sur un scrutin ─────────────────────────────

export const scrutinGroupVotes = pgTable(
  "scrutin_group_votes",
  {
    id: serial("id").primaryKey(),
    scrutinId: varchar("scrutin_id", { length: 50 })
      .notNull()
      .references(() => scrutins.id, { onDelete: "cascade" }),
    politicalGroupId: varchar("political_group_id", { length: 20 })
      .notNull()
      .references(() => politicalGroups.id, { onDelete: "cascade" }),
    nombreMembresGroupe: integer("nombre_membres_groupe"),
    positionMajoritaire: varchar("position_majoritaire", { length: 20 }),
    nombrePour: integer("nombre_pour"),
    nombreContre: integer("nombre_contre"),
    nombreAbstentions: integer("nombre_abstentions"),
    nombreNonVotants: integer("nombre_non_votants"),
    nombreNonVotantsVolontaires: integer("nombre_non_votants_volontaires"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_scrutin_group_unique").on(
      table.scrutinId,
      table.politicalGroupId
    ),
    index("idx_scrutin_group_group").on(table.politicalGroupId, table.scrutinId),
  ]
);

// ─── Votes individuels ───────────────────────────────────────────

export const scrutinVotes = pgTable(
  "scrutin_votes",
  {
    id: serial("id").primaryKey(),
    scrutinId: varchar("scrutin_id", { length: 50 })
      .notNull()
      .references(() => scrutins.id, { onDelete: "cascade" }),
    deputyId: varchar("deputy_id", { length: 20 })
      .notNull()
      .references(() => deputies.id, { onDelete: "cascade" }),
    mandateId: varchar("mandate_id", { length: 20 })
      .notNull()
      .references(() => deputyMandates.id, { onDelete: "cascade" }),
    politicalGroupId: varchar("political_group_id", { length: 20 })
      .notNull()
      .references(() => politicalGroups.id),
    position: votePositionEnum("position").notNull(),
    parDelegation: boolean("par_delegation").default(false),
    causePositionVote: varchar("cause_position_vote", { length: 50 }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_scrutin_votes_unique").on(table.scrutinId, table.deputyId),
    index("idx_scrutin_votes_deputy").on(table.deputyId, table.scrutinId),
    index("idx_scrutin_votes_scrutin_pos").on(table.scrutinId, table.position),
    index("idx_scrutin_votes_deputy_pos").on(table.deputyId, table.position),
    index("idx_scrutin_votes_group").on(table.politicalGroupId, table.scrutinId),
  ]
);

export const scrutinVotesRelations = relations(scrutinVotes, ({ one }) => ({
  scrutin: one(scrutins, {
    fields: [scrutinVotes.scrutinId],
    references: [scrutins.id],
  }),
  deputy: one(deputies, {
    fields: [scrutinVotes.deputyId],
    references: [deputies.id],
  }),
  mandate: one(deputyMandates, {
    fields: [scrutinVotes.mandateId],
    references: [deputyMandates.id],
  }),
  politicalGroup: one(politicalGroups, {
    fields: [scrutinVotes.politicalGroupId],
    references: [politicalGroups.id],
  }),
}));

// ─── Thématiques (MVP : classification par mots-clés) ────────────

export const themes = pgTable("themes", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const scrutinThemes = pgTable(
  "scrutin_themes",
  {
    id: serial("id").primaryKey(),
    scrutinId: varchar("scrutin_id", { length: 50 })
      .notNull()
      .references(() => scrutins.id, { onDelete: "cascade" }),
    themeId: integer("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    confidence: decimal("confidence", { precision: 3, scale: 2 }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_scrutin_theme_unique").on(table.scrutinId, table.themeId),
    index("idx_scrutin_theme_theme").on(table.themeId),
  ]
);

// ─── Logs de synchronisation ETL ─────────────────────────────────

export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 100 }).notNull(), // "scrutins" | "deputies" | "organes"
  legislature: varchar("legislature", { length: 10 }),
  fileUrl: text("file_url"),
  fileHash: varchar("file_hash", { length: 64 }),
  recordsProcessed: integer("records_processed"),
  recordsInserted: integer("records_inserted"),
  recordsUpdated: integer("records_updated"),
  startedAt: timestamp("started_at", { mode: "date" }).notNull(),
  completedAt: timestamp("completed_at", { mode: "date" }),
  status: syncStatusEnum("status").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Communes ↔ Circonscriptions (pour recherche par CP) ─────────

export const communes = pgTable(
  "communes",
  {
    id: varchar("id", { length: 10 }).primaryKey(), // Code INSEE
    name: varchar("name", { length: 200 }).notNull(),
    postalCode: varchar("postal_code", { length: 10 }).notNull(),
    departmentId: varchar("department_id", { length: 3 }).notNull(),
    circoNumber: integer("circo_number").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_communes_postal").on(table.postalCode),
    index("idx_communes_dept_circo").on(table.departmentId, table.circoNumber),
  ]
);
```

### 3.3. Justification des index

| Index | Tables | Justification |
|-------|--------|---------------|
| `idx_deputies_search` (GIN tsvector) | `deputies` | Recherche full-text rapide par nom/prénom |
| `idx_deputies_circo` | `deputies` | Filtrage par département + numéro de circonscription |
| `idx_mandates_legislature_date` | `deputy_mandates` | Sélection des mandats actifs à une date donnée |
| `idx_scrutins_legislature_date` | `scrutins` | Liste des scrutins par législature, triés par date décroissante |
| `idx_scrutins_search` (GIN tsvector) | `scrutins` | Recherche texte dans titre et objet du scrutin |
| `idx_scrutin_votes_unique` | `scrutin_votes` | Contrainte d'unicité (1 vote par député et par scrutin) |
| `idx_scrutin_votes_deputy` | `scrutin_votes` | Récupération de l'historique des votes d'un député |
| `idx_scrutin_votes_scrutin_pos` | `scrutin_votes` | Filtrage des votes par position sur un scrutin donné |
| `idx_communes_postal` | `communes` | Résolution code postal → circonscription |

---

## 4. Conception API REST (Fastify + Zod)

### 4.1. Principes transversaux

- **Enveloppe de réponse** uniforme :
  ```json
  // Succès
  {
    "data": { ... },
    "meta": {
      "total": 150,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }

  // Erreur
  {
    "error": {
      "code": "DEPUTY_NOT_FOUND",
      "message": "Député non trouvé",
      "statusCode": 404
    }
  }
  ```

- **Pagination** : curseur pour les listes chronologiques (votes, scrutins) ; offset pour les listes statiques (députés, groupes).
- **Rate limiting** : `429 Too Many Requests` avec header `Retry-After`. Limites : 60 req/min par IP, 120 req/min par API key (V1).
- **CORS** : origines contrôlées (frontend + API publique V1).
- **Compression** : Brotli/Gzip activé sur les payloads JSON.

### 4.2. Schémas Zod de validation

```typescript
// src/modules/common/schema.ts
import { z } from "zod";

export const CursorPaginationQuery = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(), // base64("dateScrutin:id")
});

export const OffsetPaginationQuery = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// src/modules/deputies/schema.ts
export const SearchDeputiesQuery = z.object({
  q: z.string().min(1).max(100).optional(),
  department: z.string().length(2).optional(),
  circo: z.coerce.number().min(1).max(21).optional(),
  group: z.string().optional(),
  legislature: z.string().default("17"),
  ...OffsetPaginationQuery.shape,
});

export const DeputyVotesQuery = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  type: z
    .enum(["solennel", "motion_censure", "amendement", "budget", "autre"])
    .optional(),
  theme: z.string().optional(),
  position: z
    .enum(["pour", "contre", "abstention", "nonVotant"])
    .optional(),
  ...CursorPaginationQuery.shape,
});

// src/modules/scrutins/schema.ts
export const SearchScrutinsQuery = z.object({
  q: z.string().min(1).max(200).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  type: z.string().optional(),
  theme: z.string().optional(),
  sort: z.enum(["date_desc", "date_asc", "relevance"]).default("date_desc"),
  ...CursorPaginationQuery.shape,
});

export const ScrutinVotesQuery = z.object({
  group: z.string().optional(),
  position: z
    .enum(["pour", "contre", "abstention", "nonVotant"])
    .optional(),
  ...OffsetPaginationQuery.shape,
});

// src/modules/compare/schema.ts
export const CompareQuery = z.object({
  deputies: z
    .string()
    .regex(/^PA\d+(,PA\d+){1,4}$/, "2 à 5 députés requis (séparés par des virgules)"),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
```

### 4.3. Définition des endpoints

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `GET` | `/deputies` | Recherche de députés (nom, CP, circonscription, groupe) | — |
| `GET` | `/deputies/:id` | Fiche député avec stats agrégées | — |
| `GET` | `/deputies/:id/votes` | Historique des votes (cursor pagination) | — |
| `GET` | `/deputies/:id/stats` | Indicateurs calculés (participation, loyauté) | — |
| `GET` | `/deputies/:id/votes/export` | Export CSV/JSON des votes | — |
| `GET` | `/scrutins` | Liste des scrutins avec filtres | — |
| `GET` | `/scrutins/:id` | Détail d'un scrutin + résultats globaux | — |
| `GET` | `/scrutins/:id/votes` | Votes individuels paginés | — |
| `GET` | `/scrutins/:id/votes/export` | Export CSV/JSON des votes d'un scrutin | — |
| `GET` | `/groups` | Liste des groupes politiques | — |
| `GET` | `/groups/:id/stats` | Stats agrégées par groupe (cohésion, participation moyenne) | — |
| `GET` | `/compare` | Comparaison de votes entre 2–5 députés | — |
| `GET` | `/health` | Health check (DB + Redis) | — |

### 4.4. Exemple de route Fastify

```typescript
// src/modules/deputies/routes.ts
import { FastifyInstance } from "fastify";
import { DeputyService } from "./service";
import {
  SearchDeputiesQuery,
  DeputiesListResponse,
  DeputyVotesQuery,
  DeputyVotesResponse,
} from "./schema";

export async function deputyRoutes(app: FastifyInstance) {
  const service = new DeputyService(app.db, app.cache, app.log);

  app.get("/", {
    schema: {
      querystring: SearchDeputiesQuery,
      response: { 200: DeputiesListResponse },
    },
    handler: async (req, reply) => {
      const result = await service.search(req.query);
      return reply.send(result);
    },
  });

  app.get("/:id", {
    schema: {
      params: z.object({ id: z.string().regex(/^PA\d+$/) }),
      response: { 200: DeputyProfileResponse },
    },
    handler: async (req, reply) => {
      const result = await service.getProfile(req.params.id);
      if (!result) {
        return reply.status(404).send({
          error: { code: "DEPUTY_NOT_FOUND", message: "Député non trouvé", statusCode: 404 },
        });
      }
      return reply.send({ data: result });
    },
  });

  app.get("/:id/votes", {
    schema: {
      params: z.object({ id: z.string().regex(/^PA\d+$/) }),
      querystring: DeputyVotesQuery,
      response: { 200: DeputyVotesResponse },
    },
    handler: async (req, reply) => {
      const result = await service.getVotes(req.params.id, req.query);
      return reply.send(result);
    },
  });
}
```

---

## 5. Stratégie ETL

### 5.1. Architecture du pipeline

```
┌─────────────┐   ┌──────────┐   ┌──────────────┐   ┌────────────┐   ┌──────────┐
│  Scheduler  │──▶│ Downloader│──▶│   Parser     │──▶│  Loader    │──▶│  Cache   │
│ (node-cron) │   │ (fetch + │   │ (streaming   │   │ (pg tx +   │   │  Warming │
│  03:00 CET  │   │  unzip)   │   │  JSON)       │   │  batch)    │   │  & Purge │
└─────────────┘   └──────────┘   └──────────────┘   └────────────┘   └──────────┘
```

### 5.2. Étapes détaillées

#### Étape 1 — Téléchargement

- URL cible : `Scrutins.json.zip` de la législature courante
- Vérifier `Last-Modified` ou `ETag` avant téléchargement complet
- Stocker le ZIP dans `TEMP_DIR` (défaut `./tmp/etl`)
- Calculer le SHA-256 du fichier ; si identique au dernier `syncLogs.fileHash`, arrêt

#### Étape 2 — Décompression & Parsing streaming

- Extraire le ZIP dans `TEMP_DIR` via `packages/etl/src/parser/zip-extract.ts`
- **Sécurité** : `resolveSafeZipEntryPath` rejette les entrées avec `..`, chemins absolus ou hors répertoire cible (zip slip)
- URLs de téléchargement validées au démarrage (`validateEtlUrl` — HTTPS, hôte `data.assemblee-nationale.fr` uniquement)
- Utiliser **`stream-json`** pour parser `scrutins.scrutin[]` en streaming
- Objectif : ne jamais charger les 400 Mo JSON entièrement en mémoire Node.js
- Pour chaque objet `scrutin` :
  1. Calculer un hash SHA-256 de sa représentation JSON canonique
  2. Comparer avec `scrutins.syncHash` en base
  3. Si identique : **skip** (sauf si `miseAuPoint` présent → forcer la mise à jour)

#### Étape 3 — Normalisation

Mapping AN → Modèle interne :

| Champ AN | Champ interne | Transformation |
|----------|---------------|----------------|
| `uid` | `scrutins.id` | — |
| `numero` | `scrutins.numero` | `parseInt` |
| `dateScrutin` | `scrutins.dateScrutin` | `new Date()` |
| `sort.code` | `scrutins.sortCode` | Enum mapping |
| `titre` | `scrutins.titre` | Trim |
| `acteurRef` | `scrutinVotes.deputyId` | — |
| `mandatRef` | `scrutinVotes.mandateId` | — |
| `parDelegation` | `scrutinVotes.parDelegation` | Boolean |
| `positionMajoritaire` | `scrutinGroupVotes.positionMajoritaire` | Normalisation minuscule |

#### Étape 4 — Chargement transactionnel

Pour chaque scrutin modifié ou nouveau :

```typescript
await db.transaction(async (trx) => {
  // 1. Upsert scrutin
  await trx.insert(scrutins).values(scrutinRow)
    .onConflictDoUpdate({ target: scrutins.id, set: scrutinRow });

  // 2. Supprimer les anciennes données liées
  await trx.delete(scrutinGroupVotes).where(eq(scrutinGroupVotes.scrutinId, scrutinId));
  await trx.delete(scrutinVotes).where(eq(scrutinVotes.scrutinId, scrutinId));
  await trx.delete(scrutinThemes).where(eq(scrutinThemes.scrutinId, scrutinId));

  // 3. Insérer les groupes en batch (chunks de 1000)
  for (const chunk of chunks(groupVoteRows, 1000)) {
    await trx.insert(scrutinGroupVotes).values(chunk);
  }

  // 4. Insérer les votes individuels en batch
  for (const chunk of chunks(individualVoteRows, 1000)) {
    await trx.insert(scrutinVotes).values(chunk);
  }

  // 5. Classifier les thématiques (MVP : règles keywords)
  const themes = classifyThemes(scrutinRow.titre, scrutinRow.objet);
  await trx.insert(scrutinThemes).values(themes);
});
```

**Batch size recommandé** : 1 000 lignes par `INSERT` pour équilibrer vitesse et mémoire.

#### Étape 5 — Synchronisation des députés et groupes

Le pipeline ETL lance également (avant les scrutins) :
1. Téléchargement des **députés actifs** (`AMO10_deputes_actifs.json.zip`)
2. Téléchargement des **organes** (`AMO20_organe.json.zip`)
3. Upsert des `deputies`, `deputyMandates`, `politicalGroups`, `deputyGroupAffiliations`

#### Étape 6 — Post-traitement

- Mettre à jour les **vues matérialisées** (si utilisées pour les classements)
- Incrémenter le **compteur de génération de cache** Redis
- Logger le résultat dans `syncLogs`
- Supprimer les fichiers temporaires

### 5.3. Gestion des erreurs et reprise

- Toute erreur dans une transaction de scrutin déclenche un **rollback** local (les autres scrutins continuent)
- Le job global est idempotent : relancer le même ZIP ne produit pas de doublons grâce aux contraintes d'unicité
- `syncLogs` conserve l'historique des exécutions pour le debugging
- Alerte (webhook/email) si `syncLogs.status = 'failed'` pendant 2 exécutions consécutives

### 5.4. Planification

| Job | Fréquence | Heure | Source |
|-----|-----------|-------|--------|
| Sync scrutins | Quotidien | 03:00 CET | ZIP Scrutins.json |
| Sync députés | Quotidien | 03:15 CET | ZIP AMO10 |
| Sync organes | Quotidien | 03:30 CET | ZIP AMO20 |
| Classify themes | Quotidien | 04:00 CET | Règles internes + review queue |

---

## 6. Requêtes SQL optimisées

### 6.1. Recherche député par nom / circonscription

**Cas d'usage** : barre de recherche homepage (US-MVP-01), autocomplétion.

```sql
-- Recherche par nom avec classement de pertinence
WITH matched AS (
  SELECT
    d.id,
    d.first_name,
    d.last_name,
    d.photo_url,
    d.department_id,
    d.circo_number,
    d.circo_label,
    pg.name AS group_name,
    pg.abbreviation AS group_abbreviation,
    -- Score de pertinence
    CASE
      WHEN unaccent(d.last_name) ILIKE unaccent(:query || '%') THEN 0
      WHEN unaccent(d.last_name) ILIKE unaccent('%' || :query || '%') THEN 1
      WHEN unaccent(d.first_name) ILIKE unaccent('%' || :query || '%') THEN 2
      ELSE 3
    END AS rank_score
  FROM deputies d
  LEFT JOIN deputy_group_affiliations dga
    ON dga.deputy_id = d.id AND dga.end_date IS NULL
  LEFT JOIN political_groups pg
    ON pg.id = dga.political_group_id
  WHERE
    unaccent(d.last_name || ' ' || d.first_name) ILIKE unaccent('%' || :query || '%')
    OR unaccent(d.first_name || ' ' || d.last_name) ILIKE unaccent('%' || :query || '%')
)
SELECT * FROM matched
ORDER BY rank_score, last_name, first_name
LIMIT :limit OFFSET :offset;
```

**Recherche par code postal** (via table `communes`) :

```sql
SELECT d.*, pg.abbreviation AS group_abbreviation
FROM communes c
JOIN deputies d
  ON d.department_id = c.department_id AND d.circo_number = c.circo_number
LEFT JOIN deputy_group_affiliations dga
  ON dga.deputy_id = d.id AND dga.end_date IS NULL
LEFT JOIN political_groups pg ON pg.id = dga.political_group_id
WHERE c.postal_code = :postalCode;
```

### 6.2. Liste des votes d'un député avec filtres

**Cas d'usage** : onglet "Votes" de la fiche député (US-MVP-03), avec filtres période/type/thème/position.

```sql
SELECT
  s.id AS scrutin_id,
  s.numero,
  s.date_scrutin,
  s.titre,
  s.code_type_vote,
  s.sort_code,
  sv.position,
  sv.par_delegation,
  sgv.position_majoritaire AS group_position,
  CASE
    WHEN sv.position = sgv.position_majoritaire THEN 'aligned'
    WHEN sv.position IN ('pour', 'contre')
         AND sgv.position_majoritaire IN ('pour', 'contre')
         AND sv.position != sgv.position_majoritaire THEN 'opposed'
    ELSE 'neutral'
  END AS alignment
FROM scrutin_votes sv
JOIN scrutins s ON s.id = sv.scrutin_id
LEFT JOIN scrutin_group_votes sgv
  ON sgv.scrutin_id = sv.scrutin_id
  AND sgv.political_group_id = sv.political_group_id
WHERE sv.deputy_id = :deputyId
  AND (:from IS NULL OR s.date_scrutin >= :from::date)
  AND (:to IS NULL OR s.date_scrutin <= :to::date)
  AND (:type IS NULL OR s.code_type_vote = :type)
  AND (:position IS NULL OR sv.position = :position)
  AND (:themeSlug IS NULL OR EXISTS (
    SELECT 1 FROM scrutin_themes st
    JOIN themes t ON t.id = st.theme_id
    WHERE st.scrutin_id = s.id AND t.slug = :themeSlug
  ))
  -- Cursor pagination : dateScrutin DESC, scrutin.id DESC
  AND (
    :cursorDate IS NULL
    OR (s.date_scrutin, s.id) < (:cursorDate::date, :cursorId)
  )
ORDER BY s.date_scrutin DESC, s.id DESC
LIMIT :limit;
```

### 6.3. Détail d'un scrutin avec tous les votes

**Cas d'usage** : page scrutin (US-MVP-06) avec répartition par groupe et liste nominative.

```sql
-- 1. Métadonnées du scrutin
SELECT * FROM scrutins WHERE id = :scrutinId;

-- 2. Répartition par groupe
SELECT
  pg.id,
  pg.name,
  pg.abbreviation,
  sgv.position_majoritaire,
  sgv.nombre_membres_groupe,
  sgv.nombre_pour,
  sgv.nombre_contre,
  sgv.nombre_abstentions,
  sgv.nombre_non_votants
FROM scrutin_group_votes sgv
JOIN political_groups pg ON pg.id = sgv.political_group_id
WHERE sgv.scrutin_id = :scrutinId
ORDER BY sgv.nombre_membres_groupe DESC;

-- 3. Votes individuels paginés (filtrables par groupe/position)
SELECT
  d.id,
  d.first_name,
  d.last_name,
  d.photo_url,
  sv.position,
  sv.par_delegation,
  sv.cause_position_vote,
  pg.abbreviation AS group_abbreviation
FROM scrutin_votes sv
JOIN deputies d ON d.id = sv.deputy_id
LEFT JOIN political_groups pg ON pg.id = sv.political_group_id
WHERE sv.scrutin_id = :scrutinId
  AND (:groupId IS NULL OR sv.political_group_id = :groupId)
  AND (:position IS NULL OR sv.position = :position)
ORDER BY d.last_name, d.first_name
LIMIT :limit OFFSET :offset;
```

### 6.4. Comparaison de votes entre députés

**Cas d'usage** : comparateur (US-MVP-04), calcul du score de concordance.

```sql
-- Score de concordance global (2 députés)
WITH common AS (
  SELECT
    sv1.scrutin_id,
    sv1.position AS pos1,
    sv2.position AS pos2
  FROM scrutin_votes sv1
  JOIN scrutin_votes sv2
    ON sv1.scrutin_id = sv2.scrutin_id
  JOIN scrutins s ON s.id = sv1.scrutin_id
  WHERE sv1.deputy_id = :deputy1
    AND sv2.deputy_id = :deputy2
    AND sv1.position IN ('pour', 'contre', 'abstention')
    AND sv2.position IN ('pour', 'contre', 'abstention')
    AND (:from IS NULL OR s.date_scrutin >= :from::date)
    AND (:to IS NULL OR s.date_scrutin <= :to::date)
)
SELECT
  COUNT(*) AS total_common,
  SUM(CASE WHEN pos1 = pos2 THEN 1 ELSE 0 END) AS identical_count,
  ROUND(
    100.0 * SUM(CASE WHEN pos1 = pos2 THEN 1 ELSE 0 END)
    / NULLIF(COUNT(*), 0),
    2
  ) AS concordance_rate
FROM common;

-- Liste des votes divergents avec détails
SELECT
  s.id,
  s.numero,
  s.date_scrutin,
  s.titre,
  s.sort_code,
  sv1.position AS deputy_1_position,
  sv2.position AS deputy_2_position
FROM scrutin_votes sv1
JOIN scrutin_votes sv2 ON sv1.scrutin_id = sv2.scrutin_id
JOIN scrutins s ON s.id = sv1.scrutin_id
WHERE sv1.deputy_id = :deputy1
  AND sv2.deputy_id = :deputy2
  AND sv1.position IN ('pour', 'contre', 'abstention')
  AND sv2.position IN ('pour', 'contre', 'abstention')
  AND sv1.position != sv2.position
  AND (:from IS NULL OR s.date_scrutin >= :from::date)
  AND (:to IS NULL OR s.date_scrutin <= :to::date)
ORDER BY s.date_scrutin DESC
LIMIT :limit;
```

**Extension N députés** : utiliser une agrégation par `scrutin_id` avec `array_agg(position)` et compter les modes.

### 6.5. Calcul des indicateurs (participation, loyauté, cohésion)

**Participation d'un député** :

```sql
WITH eligible AS (
  SELECT s.id, s.date_scrutin
  FROM scrutins s
  WHERE s.legislature = :legislature
    AND (:from IS NULL OR s.date_scrutin >= :from::date)
    AND (:to IS NULL OR s.date_scrutin <= :to::date)
),
votes AS (
  SELECT
    sv.scrutin_id,
    sv.position
  FROM scrutin_votes sv
  WHERE sv.deputy_id = :deputyId
)
SELECT
  COUNT(DISTINCT e.id) AS total_scrutins,
  COUNT(CASE WHEN v.position IN ('pour', 'contre', 'abstention') THEN 1 END) AS votes_cast,
  COUNT(CASE WHEN v.position = 'nonVotant' THEN 1 END) AS absences,
  ROUND(
    100.0 * COUNT(CASE WHEN v.position IN ('pour', 'contre', 'abstention') THEN 1 END)
    / NULLIF(COUNT(DISTINCT e.id), 0),
    2
  ) AS participation_rate
FROM eligible e
LEFT JOIN votes v ON v.scrutin_id = e.id;
```

**Loyauté au groupe** :

```sql
WITH aligned_votes AS (
  SELECT
    sv.scrutin_id,
    sv.position,
    sgv.position_majoritaire
  FROM scrutin_votes sv
  JOIN scrutins s ON s.id = sv.scrutin_id
  JOIN scrutin_group_votes sgv
    ON sgv.scrutin_id = sv.scrutin_id
    AND sgv.political_group_id = sv.political_group_id
  WHERE sv.deputy_id = :deputyId
    AND s.legislature = :legislature
    AND sv.position IN ('pour', 'contre', 'abstention')
    AND sgv.position_majoritaire IN ('pour', 'contre', 'abstention')
)
SELECT
  COUNT(*) AS votes_with_majority,
  SUM(CASE WHEN position = position_majoritaire THEN 1 ELSE 0 END) AS loyal_votes,
  ROUND(
    100.0 * SUM(CASE WHEN position = position_majoritaire THEN 1 ELSE 0 END)
    / NULLIF(COUNT(*), 0),
    2
  ) AS loyalty_rate
FROM aligned_votes;
```

**Cohésion d'un groupe politique** :

```sql
WITH group_votes AS (
  SELECT
    sv.scrutin_id,
    sv.position,
    sgv.position_majoritaire
  FROM scrutin_votes sv
  JOIN scrutins s ON s.id = sv.scrutin_id
  JOIN scrutin_group_votes sgv
    ON sgv.scrutin_id = sv.scrutin_id
    AND sgv.political_group_id = :groupId
  WHERE sv.political_group_id = :groupId
    AND s.legislature = :legislature
    AND sv.position IN ('pour', 'contre', 'abstention')
    AND sgv.position_majoritaire IN ('pour', 'contre', 'abstention')
)
SELECT
  COUNT(*) AS total_votes,
  SUM(CASE WHEN position = position_majoritaire THEN 1 ELSE 0 END) AS aligned_votes,
  ROUND(
    100.0 * SUM(CASE WHEN position = position_majoritaire THEN 1 ELSE 0 END)
    / NULLIF(COUNT(*), 0),
    2
  ) AS cohesion_rate
FROM group_votes;
```

**Top participation (leaderboard)** :

```sql
WITH participation_stats AS (
  SELECT
    sv.deputy_id,
    COUNT(DISTINCT s.id) AS total_scrutins,
    COUNT(CASE WHEN sv.position IN ('pour', 'contre', 'abstention') THEN 1 END) AS votes_cast
  FROM scrutins s
  LEFT JOIN scrutin_votes sv
    ON sv.scrutin_id = s.id AND sv.deputy_id = :deputyId
  WHERE s.legislature = :legislature
  GROUP BY sv.deputy_id
)
SELECT
  d.id,
  d.first_name,
  d.last_name,
  d.photo_url,
  pg.abbreviation AS group_abbreviation,
  ps.votes_cast,
  ps.total_scrutins,
  ROUND(100.0 * ps.votes_cast / NULLIF(ps.total_scrutins, 0), 2) AS participation_rate
FROM participation_stats ps
JOIN deputies d ON d.id = ps.deputy_id
LEFT JOIN deputy_group_affiliations dga
  ON dga.deputy_id = d.id AND dga.end_date IS NULL
LEFT JOIN political_groups pg ON pg.id = dga.political_group_id
ORDER BY participation_rate DESC
LIMIT 20;
```

### 6.6. Recommandations d'optimisation supplémentaires

- **Vue matérialisée `deputy_stats`** : si le calcul temps réel des indicateurs ralentit la fiche député sous forte charge, précalculer les stats dans une table dérivée rafraîchie après chaque ETL.
- **Partitionnement** : non nécessaire à ce volume (~3,3 M votes). À réévaluer si on intègre >5 législatures (>15 M votes).
- **Connection pooling** : utiliser `pg` avec `max: 20` et un PgBouncer en mode transaction si déploiement serverless.

---

## 7. Stratégie de cache Redis

### 7.1. Principe : Invalidation par génération

Plutôt que de scanner et supprimer des clés par pattern (coûteux en Redis), on utilise un **compteur de génération** global par législature. Les clés de cache incluent ce numéro de génération.

```
# Génération actuelle
GET cache:gen:17 → 42

# Clé de cache
GET v1:deputies:profile:PA1234:gen:42
```

Après chaque ETL réussi :
```
INCR cache:gen:17  → 43
```

Les anciennes clés expirent naturellement via TTL. Aucun `SCAN` / `DEL` massif requis.

### 7.2. Matrice de cache

| Ressource | Clé | TTL | Warming |
|-----------|-----|-----|---------|
| Recherche députés | `v1:deputies:search:{hash}:{gen}` | 30 min | Non |
| Profil député + stats | `v1:deputies:profile:{id}:{gen}` | 15 min | Oui (top 50) |
| Votes d'un député | `v1:deputies:votes:{id}:{cursor}:{filters}:{gen}` | 10 min | Non |
| Détail scrutin | `v1:scrutins:{id}:{gen}` | 30 min | Oui (derniers 20) |
| Votes par scrutin | `v1:scrutins:votes:{id}:{page}:{filters}:{gen}` | 10 min | Non |
| Comparaison | `v1:compare:{hash}:{gen}` | 15 min | Non |
| Groupes & stats | `v1:groups:{id}:{gen}` | 1 h | Oui |
| Homepage (derniers scrutins) | `v1:home:scrutins:{gen}` | 5 min | Oui |
| Indicateurs leaderboard | `v1:leaderboard:{type}:{gen}` | 1 h | Oui |

### 7.3. Implémentation TypeScript

```typescript
// src/modules/common/cache.ts
import { Redis } from "ioredis";

export class CacheService {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const val = await this.redis.get(key);
    return val ? JSON.parse(val) : null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async getGeneration(legislature: string): Promise<number> {
    const gen = await this.redis.get(`cache:gen:${legislature}`);
    return gen ? parseInt(gen, 10) : 0;
  }

  async bumpGeneration(legislature: string): Promise<number> {
    return await this.redis.incr(`cache:gen:${legislature}`);
  }

  buildKey(
    namespace: string,
    legislature: string,
    ...segments: string[]
  ): Promise<string> {
    const gen = await this.getGeneration(legislature);
    return `v1:${namespace}:${segments.join(":")}:gen:${gen}`;
  }
}
```

### 7.4. Cache warming

- **Post-ETL** : un job asynchrone précalcule et met en cache :
  - Les 20 derniers scrutins (homepage)
  - Les 50 députés les plus consultés (stats analytics)
  - Les stats des groupes politiques
- **Staleness acceptable** : les votes individuels (TTL 10 min) ne sont pas précalculés car ils varient selon les filtres utilisateurs.

---

## 8. Structure du projet backend

```
backend/
├── src/
│   ├── app.ts                    # Application Fastify (plugins, routes)
│   ├── server.ts                 # Point d'entrée (listen)
│   ├── config/
│   │   ├── env.ts                # Validation Zod des variables d'environnement
│   │   ├── database.ts           # Client Drizzle + pool pg
│   │   └── redis.ts              # Client ioredis
│   ├── db/
│   │   ├── schema.ts             # Schéma Drizzle ORM complet
│   │   ├── migrations/           # Fichiers de migration Drizzle
│   │   └── seed.ts               # Seeds (législatures, thématiques)
│   ├── modules/
│   │   ├── deputies/
│   │   │   ├── routes.ts         # Handlers Fastify
│   │   │   ├── service.ts        # Logique métier (participation, loyauté)
│   │   │   ├── repository.ts     # Requêtes SQL / Drizzle
│   │   │   └── schema.ts         # Zod schemas (input + response)
│   │   ├── scrutins/
│   │   │   ├── routes.ts
│   │   │   ├── service.ts
│   │   │   ├── repository.ts
│   │   │   └── schema.ts
│   │   ├── groups/
│   │   │   ├── routes.ts
│   │   │   ├── service.ts
│   │   │   ├── repository.ts
│   │   │   └── schema.ts
│   │   ├── compare/
│   │   │   ├── routes.ts
│   │   │   ├── service.ts
│   │   │   ├── repository.ts
│   │   │   └── schema.ts
│   │   └── etl/
│   │       ├── downloader.ts     # Téléchargement ZIP + hash check
│   │       ├── parser.ts         # Streaming JSON + mapping
│   │       ├── loader.ts         # Upsert transactionnel en DB
│   │       ├── classifier.ts     # Classification thématique (keywords)
│   │       ├── scheduler.ts      # Cron jobs (node-cron)
│   │       └── index.ts          # Orchestration du pipeline
│   ├── plugins/
│   │   ├── error-handler.ts      # Format uniforme des erreurs
│   │   ├── request-logger.ts     # Structured logging (pino)
│   │   ├── rate-limiter.ts       # @fastify/rate-limit (store Redis)
│   │   ├── cors.ts               # @fastify/cors
│   │   ├── helmet.ts             # @fastify/helmet
│   │   └── swagger.ts            # @fastify/swagger (OpenAPI)
│   ├── common/
│   │   ├── cache.ts              # CacheService (Redis)
│   │   ├── errors.ts             # Classes d'erreur métier
│   │   ├── pagination.ts         # Helpers cursor / offset
│   │   └── types.ts              # Types partagés
│   └── jobs/
│       └── etl-runner.ts         # Script CLI pour lancer l'ETL manuellement
├── tests/
│   ├── unit/                     # Services purs (calcul indicateurs)
│   ├── integration/              # Routes + DB (testcontainers)
│   └── fixtures/                 # Données de test (scrutins simplifiés)
├── drizzle.config.ts             # Configuration Drizzle Kit
├── package.json
├── tsconfig.json
└── Dockerfile
```

### 8.1. Séparation des couches

| Couche | Responsabilité | Exemple |
|--------|----------------|---------|
| **Routes** | Validation entrée, sérialisation sortie, HTTP status | `deputies/routes.ts` |
| **Service** | Logique métier, orchestration, calcul d'indicateurs | `DeputyService.computeStats()` |
| **Repository** | Requêtes SQL, transactions, abstraction Drizzle | `DeputyRepository.findById()` |
| **ETL** | Ingestion, transformation, normalisation des sources | `etl/loader.ts` |

### 8.2. Variables d'environnement clés

```bash
# Base de données
DATABASE_URL=postgresql://user:pass@localhost:5432/votes_transparence

# Redis
REDIS_URL=redis://localhost:6379

# Application
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# ETL
ETL_ENABLED=true
ETL_SCRUTINS_URL=https://data.assemblee-nationale.fr/.../Scrutins.json.zip
ETL_TEMP_DIR=/tmp/an-etl

# Cache
CACHE_DEFAULT_TTL=900
CACHE_GEN_PREFIX=v1
```

---

## 9. Sécurité & conformité

### 9.1. Sécurité

- **Injection SQL** : impossible par design (Drizzle ORM + paramètres bindés)
- **Rate limiting** : Redis-backed, 60 req/min par IP
- **Headers de sécurité** : `helmet` activé (CSP, HSTS, X-Frame-Options)
- **Validation stricte** : Zod rejette tout input non conforme avant traitement
- **Pas de secrets en dur** : toute configuration via variables d'environnement

### 9.2. RGPD

- **Données des députés** : données publiques dans l'exercice du mandat, utilisation à des fins d'information légitime
- **Données utilisateurs** (V1) : email uniquement pour les alertes, opt-in explicite, suppression sur demande
- **Pas de traçage publicitaire** : analytics Matomo auto-hébergé recommandé
- **Hébergement** : France ou UE recommandé (OVH, Scaleway, Hetzner)

### 9.3. Licence des données

- Source : Assemblée Nationale — Licence Ouverte 2.0
- Obligation : mention de la source et de la date de dernière synchronisation sur chaque page / API response (`meta.syncedAt`)

---

## 10. Tests

### 10.1. Stratégie

| Type | Portée | Outils |
|------|--------|--------|
| **Unitaires** | Calcul d'indicateurs (concordance, participation, loyauté) | Vitest |
| **Intégration** | Routes API + requêtes SQL sur base de test | Vitest + `testcontainers` (PostgreSQL) |
| **ETL** | Parsing d'un extrait JSON AN (fixture de 3 scrutins) | Vitest |

### 10.2. Exemple de test unitaire (indicateur)

```typescript
// tests/unit/loyalty.test.ts
import { describe, it, expect } from "vitest";
import { calculateLoyalty } from "../../src/modules/deputies/service";

describe("calculateLoyalty", () => {
  it("returns 100% when all votes align with group", () => {
    const votes = [
      { position: "pour", groupPosition: "pour" },
      { position: "contre", groupPosition: "contre" },
    ];
    expect(calculateLoyalty(votes)).toBe(100);
  });

  it("excludes abstentions when group is split", () => {
    const votes = [
      { position: "pour", groupPosition: "pour" },
      { position: "contre", groupPosition: "pour" },
    ];
    expect(calculateLoyalty(votes)).toBe(50);
  });
});
```

---

## 11. Roadmap technique

| Jalon | Livrable | Semaine |
|-------|----------|---------|
| **J1** | Setup projet, schéma Drizzle, migrations, seeds | 1 |
| **J2** | ETL complet (download → parse → load), tests fixtures | 2 |
| **J3** | API députés (search, profile, votes) + cache Redis | 3 |
| **J4** | API scrutins (list, detail, votes) + recherche texte | 4 |
| **J5** | Comparateur + indicateurs (participation, loyauté) | 5 |
| **J6** | Export CSV/JSON, rate limiting, documentation OpenAPI | 6 |
| **J7** | Tests de charge (k6), optimisation requêtes lentes | 7 |
| **J8** | Monitoring (health checks, alertes ETL), polissage | 8 |

---

## 12. Risques et mitigation

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Changement de format JSON AN | Moyenne | Élevé | Pipeline ETL versionné + hash de structure + alerting si parsing échoue |
| Trafic viral soudain | Moyenne | Moyen | Cache agressif + CDN (Cloudflare) + rate limiting |
| Données AN en retard / indisponibles | Faible | Moyen | Fallback sur page "Dernière synchro : XXX" + retry exponentiel |
| Volume de données croissant (multi-législatures) | Moyenne | Moyen | Partitionnement future par législature + table `deputy_stats` précalculée |
| Erreur de transcription (accusation de partialité) | Faible | Élevé | Tests automatisés sur fixtures AN officielles + page méthodologie |

---

*Document rédigé par le Backend Developer — 2026-05-19*  
*Prochaine étape : Revue avec l'Architecte, puis mise en place du repo et génération des migrations Drizzle.*
