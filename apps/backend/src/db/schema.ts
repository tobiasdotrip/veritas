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

export const legislaturesRelations = relations(legislatures, ({ many }) => ({
  deputies: many(deputies),
  scrutins: many(scrutins),
  politicalGroups: many(politicalGroups),
}));

// ─── Députés (Acteurs) ───────────────────────────────────────────

export const deputies = pgTable(
  "deputies",
  {
    id: varchar("id", { length: 20 }).primaryKey(), // PA1234
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    civility: varchar("civility", { length: 10 }),
    dateOfBirth: timestamp("date_of_birth", { mode: "date" }),
    placeOfBirth: varchar("place_of_birth", { length: 200 }),
    departmentId: varchar("department_id", { length: 3 }), // "075"
    circoNumber: integer("circo_number"),
    circoLabel: text("circo_label"),
    photoUrl: text("photo_url"),
    profession: varchar("profession", { length: 255 }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_deputies_slug").on(table.slug),
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
    votes: many(scrutinVotes),
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

export const deputyGroupAffiliationsRelations = relations(
  deputyGroupAffiliations,
  ({ one }) => ({
    deputy: one(deputies, {
      fields: [deputyGroupAffiliations.deputyId],
      references: [deputies.id],
    }),
    politicalGroup: one(politicalGroups, {
      fields: [deputyGroupAffiliations.politicalGroupId],
      references: [politicalGroups.id],
    }),
    mandate: one(deputyMandates, {
      fields: [deputyGroupAffiliations.mandateId],
      references: [deputyMandates.id],
    }),
  })
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
    uniqueIndex("idx_scrutins_id").on(table.id),
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

export const scrutinGroupVotesRelations = relations(
  scrutinGroupVotes,
  ({ one }) => ({
    scrutin: one(scrutins, {
      fields: [scrutinGroupVotes.scrutinId],
      references: [scrutins.id],
    }),
    politicalGroup: one(politicalGroups, {
      fields: [scrutinGroupVotes.politicalGroupId],
      references: [politicalGroups.id],
    }),
  })
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

// ─── Thématiques ─────────────────────────────────────────────────

export const themes = pgTable("themes", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const themesRelations = relations(themes, ({ many }) => ({
  scrutins: many(scrutinThemes),
}));

// ─── Liaison scrutin ↔ thématique ────────────────────────────────

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

export const scrutinThemesRelations = relations(scrutinThemes, ({ one }) => ({
  scrutin: one(scrutins, {
    fields: [scrutinThemes.scrutinId],
    references: [scrutins.id],
  }),
  theme: one(themes, {
    fields: [scrutinThemes.themeId],
    references: [themes.id],
  }),
}));

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
