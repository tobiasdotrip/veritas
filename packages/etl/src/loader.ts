import { sql, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@veritas/shared";
import type { EtlConfig } from "./config.js";
import type {
  ParsedScrutin,
  ParsedVote,
  ParsedDeputy,
  ParsedPoliticalGroup,
  ParsedMandate,
  ParsedAffiliation,
  ParsedAmendment,
} from "./parser/index.js";

export interface LoaderDeps {
  db: NodePgDatabase<typeof schema>;
  pool: Pool;
}

export function createLoader(pool: Pool): LoaderDeps {
  const db = drizzle(pool, { schema });
  return { db, pool };
}

// ─── Députés ─────────────────────────────────────────────────────

export async function loadDeputies(
  deps: LoaderDeps,
  deputies: AsyncIterable<ParsedDeputy>,
  _config: EtlConfig,
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for await (const d of deputies) {
    const values = {
      id: d.id,
      firstName: d.firstName,
      lastName: d.lastName,
      slug: d.slug,
      civility: d.civility ?? null,
      dateOfBirth: d.dateOfBirth ?? null,
      placeOfBirth: d.placeOfBirth ?? null,
      departmentId: d.departmentId ?? null,
      circoNumber: d.circoNumber ?? null,
      circoLabel: d.circoLabel ?? null,
      photoUrl: d.photoUrl ?? null,
      profession: d.profession ?? null,
      updatedAt: new Date(),
    };

    const existing = await deps.db
      .select({ id: schema.deputies.id })
      .from(schema.deputies)
      .where(eq(schema.deputies.id, d.id))
      .limit(1);

    if (existing.length > 0) {
      await deps.db
        .update(schema.deputies)
        .set(values)
        .where(eq(schema.deputies.id, d.id));
      updated++;
    } else {
      await deps.db
        .insert(schema.deputies)
        .values({ ...values, createdAt: new Date() });
      inserted++;
    }
  }

  return { inserted, updated };
}

// ─── Mandats ─────────────────────────────────────────────────────

export async function loadMandates(
  deps: LoaderDeps,
  mandates: AsyncIterable<ParsedMandate>,
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for await (const m of mandates) {
    const values = {
      id: m.id,
      deputyId: m.deputyId,
      legislature: m.legislature,
      startDate: m.startDate,
      endDate: m.endDate ?? null,
      departmentId: m.departmentId ?? null,
      circoNumber: m.circoNumber ?? null,
      circoLabel: m.circoLabel ?? null,
      electionCause: m.electionCause ?? null,
      endCause: m.endCause ?? null,
    };

    const existing = await deps.db
      .select({ id: schema.deputyMandates.id })
      .from(schema.deputyMandates)
      .where(eq(schema.deputyMandates.id, m.id))
      .limit(1);

    if (existing.length > 0) {
      await deps.db
        .update(schema.deputyMandates)
        .set(values)
        .where(eq(schema.deputyMandates.id, m.id));
      updated++;
    } else {
      await deps.db
        .insert(schema.deputyMandates)
        .values({ ...values, createdAt: new Date() });
      inserted++;
    }
  }

  return { inserted, updated };
}

// ─── Affiliations ────────────────────────────────────────────────

export async function loadAffiliations(
  deps: LoaderDeps,
  affiliations: AsyncIterable<ParsedAffiliation>,
): Promise<{ inserted: number }> {
  let inserted = 0;

  for await (const a of affiliations) {
    const values = {
      deputyId: a.deputyId,
      politicalGroupId: a.politicalGroupId,
      mandateId: a.mandateId,
      startDate: a.startDate,
      endDate: a.endDate ?? null,
      createdAt: new Date(),
    };

    await deps.db
      .insert(schema.deputyGroupAffiliations)
      .values(values)
      .onConflictDoUpdate({
        target: [
          schema.deputyGroupAffiliations.deputyId,
          schema.deputyGroupAffiliations.politicalGroupId,
          schema.deputyGroupAffiliations.mandateId,
          schema.deputyGroupAffiliations.startDate,
        ],
        set: {
          endDate: values.endDate,
        },
      });
    inserted++;
  }

  return { inserted };
}

// ─── Groupes politiques ──────────────────────────────────────────

export async function loadPoliticalGroups(
  deps: LoaderDeps,
  groups: AsyncIterable<ParsedPoliticalGroup>,
  _config: EtlConfig,
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for await (const g of groups) {
    const values = {
      id: g.id,
      legislature: g.legislature,
      name: g.name,
      abbreviation: g.abbreviation ?? null,
      startDate: g.startDate ?? null,
      endDate: g.endDate ?? null,
    };

    const existing = await deps.db
      .select({ id: schema.politicalGroups.id })
      .from(schema.politicalGroups)
      .where(eq(schema.politicalGroups.id, g.id))
      .limit(1);

    if (existing.length > 0) {
      await deps.db
        .update(schema.politicalGroups)
        .set(values)
        .where(eq(schema.politicalGroups.id, g.id));
      updated++;
    } else {
      await deps.db
        .insert(schema.politicalGroups)
        .values({ ...values, createdAt: new Date() });
      inserted++;
    }
  }

  return { inserted, updated };
}

// ─── Scrutins ────────────────────────────────────────────────────

interface ScrutinBatchItem {
  scrutin: ParsedScrutin;
  votes: ParsedVote[];
}

export async function loadScrutins(
  deps: LoaderDeps,
  scrutinsIter: AsyncIterable<ParsedScrutin>,
  config: EtlConfig,
  onProgress?: (processed: number) => void,
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  const updated = 0;
  let errors = 0;
  let processed = 0;

  let batch: ScrutinBatchItem[] = [];

  async function flushBatch() {
    if (batch.length === 0) return;

    try {
      await deps.db.transaction(async (trx) => {
        for (const item of batch) {
          const s = item.scrutin;

          const scrutinValues = {
            id: s.id,
            legislature: s.legislature,
            numero: s.numero,
            organeRef: s.organeRef ?? null,
            sessionRef: s.sessionRef ?? null,
            seanceRef: s.seanceRef ?? null,
            dateScrutin: s.dateScrutin,
            quantiemeJourSeance: s.quantiemeJourSeance ?? null,
            codeTypeVote: s.codeTypeVote ?? null,
            libelleTypeVote: s.libelleTypeVote ?? null,
            typeMajorite: s.typeMajorite ?? null,
            sortCode: s.sortCode ?? null,
            sortLibelle: s.sortLibelle ?? null,
            titre: s.titre,
            demandeur: s.demandeur ?? null,
            objet: s.objet ?? null,
            modePublicationDesVotes: s.modePublicationDesVotes ?? null,
            nombreVotants: s.nombreVotants ?? null,
            suffragesExprimes: s.suffragesExprimes ?? null,
            nombrePour: s.nombrePour ?? null,
            nombreContre: s.nombreContre ?? null,
            nombreAbstentions: s.nombreAbstentions ?? null,
            nombreNonVotants: s.nombreNonVotants ?? null,
            nombreNonVotantsVolontaires: s.nombreNonVotantsVolontaires ?? null,
            syncHash: null,
            updatedAt: new Date(),
          };

          await trx
            .insert(schema.scrutins)
            .values({ ...scrutinValues, createdAt: new Date() })
            .onConflictDoUpdate({
              target: schema.scrutins.id,
              set: { updatedAt: new Date() },
            });

          if (s.groupVotes.length > 0) {
            // Ensure all referenced groups exist in political_groups.
            // The AN sometimes uses placeholder IDs like "PO0".
            const groupIds = [
              ...new Set(s.groupVotes.map((gv) => gv.politicalGroupId)),
            ];
            await trx
              .insert(schema.politicalGroups)
              .values(
                groupIds.map((id) => ({
                  id,
                  legislature: s.legislature,
                  name: id === "PO0" ? "Groupe non identifié" : id,
                  abbreviation: null,
                  createdAt: new Date(),
                })),
              )
              .onConflictDoNothing();

            // Deduplicate group votes that share the same ID within a scrutin
            // by appending a suffix (e.g. "PO0" → "PO0_1", "PO0_2").
            const seenInScrutin = new Map<string, number>();
            const dedupedGroups = s.groupVotes.map((gv) => {
              const base = gv.politicalGroupId;
              const count = seenInScrutin.get(base) ?? 0;
              seenInScrutin.set(base, count + 1);
              const uniqueId = count === 0 ? base : `${base}_${count}`;
              return { ...gv, politicalGroupId: uniqueId };
            });

            // Create deduplicated group entries if needed
            const dedupedIds = [
              ...new Set(dedupedGroups.map((gv) => gv.politicalGroupId)),
            ].filter((id) => !groupIds.includes(id));
            if (dedupedIds.length > 0) {
              await trx
                .insert(schema.politicalGroups)
                .values(
                  dedupedIds.map((id) => ({
                    id,
                    legislature: s.legislature,
                    name: `Groupe non identifié (variante ${id.split("_").pop()})`,
                    abbreviation: null,
                    createdAt: new Date(),
                  })),
                )
                .onConflictDoNothing();
            }

            await trx
              .insert(schema.scrutinGroupVotes)
              .values(
                dedupedGroups.map((gv) => ({
                  scrutinId: s.id,
                  politicalGroupId: gv.politicalGroupId,
                  nombreMembresGroupe: gv.nombreMembresGroupe ?? null,
                  positionMajoritaire: gv.positionMajoritaire ?? null,
                  nombrePour: gv.nombrePour ?? null,
                  nombreContre: gv.nombreContre ?? null,
                  nombreAbstentions: gv.nombreAbstentions ?? null,
                  nombreNonVotants: gv.nombreNonVotants ?? null,
                  nombreNonVotantsVolontaires:
                    gv.nombreNonVotantsVolontaires ?? null,
                  createdAt: new Date(),
                })),
              )
              .onConflictDoNothing();
          }
        }

        // Votes batch insert par lot de `config.batchSize`
        const allVotes: (ParsedVote & { scrutinId: string })[] = [];
        for (const item of batch) {
          for (const v of item.votes) {
            allVotes.push({ ...v, scrutinId: item.scrutin.id });
          }
        }

        for (let i = 0; i < allVotes.length; i += config.batchSize) {
          const chunk = allVotes.slice(i, i + config.batchSize);
          await trx
            .insert(schema.scrutinVotes)
            .values(
              chunk.map((v) => ({
                scrutinId: v.scrutinId,
                deputyId: v.deputyId,
                mandateId: v.mandateId,
                politicalGroupId: v.politicalGroupId,
                position: v.position,
                parDelegation: v.parDelegation,
                causePositionVote: v.causePositionVote ?? null,
                createdAt: new Date(),
              })),
            )
            .onConflictDoUpdate({
              target: [
                schema.scrutinVotes.scrutinId,
                schema.scrutinVotes.deputyId,
              ],
              set: {
                position: sql`excluded.position`,
                parDelegation: sql`excluded.par_delegation`,
                politicalGroupId: sql`excluded.political_group_id`,
                mandateId: sql`excluded.mandate_id`,
                causePositionVote: sql`excluded.cause_position_vote`,
              },
            });
        }
      });

      inserted += batch.length;
    } catch (err) {
      errors += batch.length;
      console.error(
        `[loader] Batch failed (${batch.length} scrutins): ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      batch = [];
    }
  }

  for await (const s of scrutinsIter) {
    batch.push({ scrutin: s, votes: s.votes });
    processed++;

    if (processed % config.scrutinTransactionSize === 0) {
      await flushBatch();
      onProgress?.(processed);
    }
  }

  await flushBatch();
  onProgress?.(processed);

  return { inserted, updated, errors };
}

// ─── Amendements ─────────────────────────────────────────────────

export async function loadAmendments(
  deps: LoaderDeps,
  amendments: AsyncIterable<ParsedAmendment>,
  config: EtlConfig,
  onProgress?: (processed: number) => void,
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  const updated = 0;
  let errors = 0;
  let processed = 0;

  let batch: ParsedAmendment[] = [];

  async function flushBatch() {
    if (batch.length === 0) return;

    try {
      await deps.db.transaction(async (trx) => {
        for (const a of batch) {
          const values = {
            id: a.id,
            numero: a.numero,
            texteLegislatifRef: a.texteLegislatifRef ?? null,
            dossierRef: a.dossierRef,
            dispositif: a.dispositif ?? null,
            exposeSommaire: a.exposeSommaire ?? null,
            sortCode: a.sortCode ?? null,
            articleRef: a.articleRef ?? null,
            auteurs: a.auteurs.length > 0 ? a.auteurs : null,
          };

          await trx
            .insert(schema.amendments)
            .values({ ...values, createdAt: new Date() })
            .onConflictDoUpdate({
              target: schema.amendments.id,
              set: {
                numero: values.numero,
                texteLegislatifRef: values.texteLegislatifRef,
                dossierRef: values.dossierRef,
                dispositif: values.dispositif,
                exposeSommaire: values.exposeSommaire,
                sortCode: values.sortCode,
                articleRef: values.articleRef,
                auteurs: values.auteurs,
              },
            });
        }

        inserted += batch.length;
      });
    } catch (err) {
      errors += batch.length;
      console.error(
        `[loader] Amendments batch failed (${batch.length}): ${
          err instanceof Error ? err.message : String(err)
        }`,
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

  return { inserted, updated, errors };
}
