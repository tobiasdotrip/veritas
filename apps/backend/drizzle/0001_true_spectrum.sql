CREATE TABLE "amendments" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"numero" varchar(10) NOT NULL,
	"texte_legislatif_ref" varchar(50),
	"dossier_ref" varchar(50) NOT NULL,
	"dispositif" text,
	"expose_sommaire" text,
	"sort_code" varchar(50),
	"article_ref" varchar(50),
	"auteurs" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrutin_amendments" (
	"id" serial PRIMARY KEY NOT NULL,
	"scrutin_id" varchar(50) NOT NULL,
	"amendment_id" varchar(50) NOT NULL,
	"match_method" varchar(20) NOT NULL,
	"confidence" numeric(3, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "idx_deputies_slug";--> statement-breakpoint
DROP INDEX "idx_scrutins_id";--> statement-breakpoint
ALTER TABLE "scrutins" ALTER COLUMN "organe_ref" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "scrutins" ALTER COLUMN "session_ref" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "scrutins" ALTER COLUMN "seance_ref" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "scrutin_amendments" ADD CONSTRAINT "scrutin_amendments_scrutin_id_scrutins_id_fk" FOREIGN KEY ("scrutin_id") REFERENCES "public"."scrutins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrutin_amendments" ADD CONSTRAINT "scrutin_amendments_amendment_id_amendments_id_fk" FOREIGN KEY ("amendment_id") REFERENCES "public"."amendments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_amendments_dossier_numero" ON "amendments" USING btree ("dossier_ref","numero");--> statement-breakpoint
CREATE INDEX "idx_amendments_numero" ON "amendments" USING btree ("numero");--> statement-breakpoint
CREATE INDEX "idx_amendments_texte_legislatif" ON "amendments" USING btree ("texte_legislatif_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_scrutin_amendment_unique" ON "scrutin_amendments" USING btree ("scrutin_id","amendment_id");--> statement-breakpoint
CREATE INDEX "idx_scrutin_amendment_scrutin" ON "scrutin_amendments" USING btree ("scrutin_id");--> statement-breakpoint
CREATE INDEX "idx_scrutin_amendment_amendment" ON "scrutin_amendments" USING btree ("amendment_id");--> statement-breakpoint
CREATE INDEX "idx_sync_logs_source_started" ON "sync_logs" USING btree ("source","started_at");--> statement-breakpoint
CREATE INDEX "idx_sync_logs_status" ON "sync_logs" USING btree ("status");