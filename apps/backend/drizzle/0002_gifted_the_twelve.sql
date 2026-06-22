ALTER TABLE "scrutins" ADD COLUMN "dossier_ref" varchar(50);--> statement-breakpoint
CREATE INDEX "idx_scrutins_dossier_ref" ON "scrutins" USING btree ("dossier_ref");