CREATE TYPE "public"."scrutin_sort" AS ENUM('adopté', 'rejeté');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('pending', 'running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."vote_position" AS ENUM('pour', 'contre', 'abstention', 'nonVotant');--> statement-breakpoint
CREATE TABLE "communes" (
	"id" varchar(10) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"postal_code" varchar(10) NOT NULL,
	"department_id" varchar(3) NOT NULL,
	"circo_number" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deputies" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"civility" varchar(10),
	"date_of_birth" timestamp,
	"place_of_birth" varchar(200),
	"department_id" varchar(3),
	"circo_number" integer,
	"circo_label" text,
	"photo_url" text,
	"profession" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deputies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "deputy_group_affiliations" (
	"id" serial PRIMARY KEY NOT NULL,
	"deputy_id" varchar(20) NOT NULL,
	"political_group_id" varchar(20) NOT NULL,
	"mandate_id" varchar(20) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deputy_mandates" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"deputy_id" varchar(20) NOT NULL,
	"legislature" varchar(10) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"department_id" varchar(3),
	"circo_number" integer,
	"circo_label" text,
	"election_cause" text,
	"end_cause" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legislatures" (
	"id" varchar(10) PRIMARY KEY NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "political_groups" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"legislature" varchar(10) NOT NULL,
	"name" text NOT NULL,
	"abbreviation" varchar(20),
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrutin_group_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"scrutin_id" varchar(50) NOT NULL,
	"political_group_id" varchar(20) NOT NULL,
	"nombre_membres_groupe" integer,
	"position_majoritaire" varchar(20),
	"nombre_pour" integer,
	"nombre_contre" integer,
	"nombre_abstentions" integer,
	"nombre_non_votants" integer,
	"nombre_non_votants_volontaires" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrutin_themes" (
	"id" serial PRIMARY KEY NOT NULL,
	"scrutin_id" varchar(50) NOT NULL,
	"theme_id" integer NOT NULL,
	"confidence" numeric(3, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrutin_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"scrutin_id" varchar(50) NOT NULL,
	"deputy_id" varchar(20) NOT NULL,
	"mandate_id" varchar(20) NOT NULL,
	"political_group_id" varchar(20) NOT NULL,
	"position" "vote_position" NOT NULL,
	"par_delegation" boolean DEFAULT false,
	"cause_position_vote" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrutins" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"legislature" varchar(10) NOT NULL,
	"numero" integer NOT NULL,
	"organe_ref" varchar(20),
	"session_ref" varchar(20),
	"seance_ref" varchar(20),
	"date_scrutin" timestamp NOT NULL,
	"quantieme_jour_seance" integer,
	"code_type_vote" varchar(50),
	"libelle_type_vote" text,
	"type_majorite" varchar(50),
	"sort_code" "scrutin_sort",
	"sort_libelle" text,
	"titre" text NOT NULL,
	"demandeur" text,
	"objet" text,
	"mode_publication_des_votes" varchar(50),
	"nombre_votants" integer,
	"suffrages_exprimes" integer,
	"nombre_pour" integer,
	"nombre_contre" integer,
	"nombre_abstentions" integer,
	"nombre_non_votants" integer,
	"nombre_non_votants_volontaires" integer,
	"sync_hash" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(100) NOT NULL,
	"legislature" varchar(10),
	"file_url" text,
	"file_hash" varchar(64),
	"records_processed" integer,
	"records_inserted" integer,
	"records_updated" integer,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"status" "sync_status" NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(50) NOT NULL,
	"label" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "themes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "deputy_group_affiliations" ADD CONSTRAINT "deputy_group_affiliations_deputy_id_deputies_id_fk" FOREIGN KEY ("deputy_id") REFERENCES "public"."deputies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deputy_group_affiliations" ADD CONSTRAINT "deputy_group_affiliations_political_group_id_political_groups_id_fk" FOREIGN KEY ("political_group_id") REFERENCES "public"."political_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deputy_group_affiliations" ADD CONSTRAINT "deputy_group_affiliations_mandate_id_deputy_mandates_id_fk" FOREIGN KEY ("mandate_id") REFERENCES "public"."deputy_mandates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deputy_mandates" ADD CONSTRAINT "deputy_mandates_deputy_id_deputies_id_fk" FOREIGN KEY ("deputy_id") REFERENCES "public"."deputies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deputy_mandates" ADD CONSTRAINT "deputy_mandates_legislature_legislatures_id_fk" FOREIGN KEY ("legislature") REFERENCES "public"."legislatures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "political_groups" ADD CONSTRAINT "political_groups_legislature_legislatures_id_fk" FOREIGN KEY ("legislature") REFERENCES "public"."legislatures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrutin_group_votes" ADD CONSTRAINT "scrutin_group_votes_scrutin_id_scrutins_id_fk" FOREIGN KEY ("scrutin_id") REFERENCES "public"."scrutins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrutin_group_votes" ADD CONSTRAINT "scrutin_group_votes_political_group_id_political_groups_id_fk" FOREIGN KEY ("political_group_id") REFERENCES "public"."political_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrutin_themes" ADD CONSTRAINT "scrutin_themes_scrutin_id_scrutins_id_fk" FOREIGN KEY ("scrutin_id") REFERENCES "public"."scrutins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrutin_themes" ADD CONSTRAINT "scrutin_themes_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrutin_votes" ADD CONSTRAINT "scrutin_votes_scrutin_id_scrutins_id_fk" FOREIGN KEY ("scrutin_id") REFERENCES "public"."scrutins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrutin_votes" ADD CONSTRAINT "scrutin_votes_deputy_id_deputies_id_fk" FOREIGN KEY ("deputy_id") REFERENCES "public"."deputies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrutin_votes" ADD CONSTRAINT "scrutin_votes_mandate_id_deputy_mandates_id_fk" FOREIGN KEY ("mandate_id") REFERENCES "public"."deputy_mandates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrutin_votes" ADD CONSTRAINT "scrutin_votes_political_group_id_political_groups_id_fk" FOREIGN KEY ("political_group_id") REFERENCES "public"."political_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrutins" ADD CONSTRAINT "scrutins_legislature_legislatures_id_fk" FOREIGN KEY ("legislature") REFERENCES "public"."legislatures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_communes_postal" ON "communes" USING btree ("postal_code");--> statement-breakpoint
CREATE INDEX "idx_communes_dept_circo" ON "communes" USING btree ("department_id","circo_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_deputies_slug" ON "deputies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_deputies_name" ON "deputies" USING btree ("last_name","first_name");--> statement-breakpoint
CREATE INDEX "idx_deputies_department" ON "deputies" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_deputies_circo" ON "deputies" USING btree ("department_id","circo_number");--> statement-breakpoint
CREATE INDEX "idx_deputies_search" ON "deputies" USING gin (to_tsvector('french', coalesce("last_name", '') || ' ' || coalesce("first_name", '')));--> statement-breakpoint
CREATE UNIQUE INDEX "idx_affiliations_unique" ON "deputy_group_affiliations" USING btree ("deputy_id","political_group_id","mandate_id","start_date");--> statement-breakpoint
CREATE INDEX "idx_affiliations_group" ON "deputy_group_affiliations" USING btree ("political_group_id");--> statement-breakpoint
CREATE INDEX "idx_mandates_deputy" ON "deputy_mandates" USING btree ("deputy_id");--> statement-breakpoint
CREATE INDEX "idx_mandates_legislature_date" ON "deputy_mandates" USING btree ("legislature","start_date");--> statement-breakpoint
CREATE INDEX "idx_groups_legislature" ON "political_groups" USING btree ("legislature","name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_scrutin_group_unique" ON "scrutin_group_votes" USING btree ("scrutin_id","political_group_id");--> statement-breakpoint
CREATE INDEX "idx_scrutin_group_group" ON "scrutin_group_votes" USING btree ("political_group_id","scrutin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_scrutin_theme_unique" ON "scrutin_themes" USING btree ("scrutin_id","theme_id");--> statement-breakpoint
CREATE INDEX "idx_scrutin_theme_theme" ON "scrutin_themes" USING btree ("theme_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_scrutin_votes_unique" ON "scrutin_votes" USING btree ("scrutin_id","deputy_id");--> statement-breakpoint
CREATE INDEX "idx_scrutin_votes_deputy" ON "scrutin_votes" USING btree ("deputy_id","scrutin_id");--> statement-breakpoint
CREATE INDEX "idx_scrutin_votes_scrutin_pos" ON "scrutin_votes" USING btree ("scrutin_id","position");--> statement-breakpoint
CREATE INDEX "idx_scrutin_votes_deputy_pos" ON "scrutin_votes" USING btree ("deputy_id","position");--> statement-breakpoint
CREATE INDEX "idx_scrutin_votes_group" ON "scrutin_votes" USING btree ("political_group_id","scrutin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_scrutins_id" ON "scrutins" USING btree ("id");--> statement-breakpoint
CREATE INDEX "idx_scrutins_legislature_date" ON "scrutins" USING btree ("legislature","date_scrutin" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_scrutins_date_numero" ON "scrutins" USING btree ("date_scrutin" DESC NULLS LAST,"numero" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_scrutins_type" ON "scrutins" USING btree ("code_type_vote");--> statement-breakpoint
CREATE INDEX "idx_scrutins_sort" ON "scrutins" USING btree ("sort_code");--> statement-breakpoint
CREATE INDEX "idx_scrutins_search" ON "scrutins" USING gin (to_tsvector('french', coalesce("titre", '') || ' ' || coalesce("objet", '')));