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
  _config: EtlConfig
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
  mandates: AsyncIterable<ParsedMandate>
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
  affiliations: AsyncIterable<ParsedAffiliation>
): Promise<{ inserted: number }> {
  let inserted = 0;

  for await (const a of affiliations) {
    await deps.db
      .insert(schema.deputyGroupAffiliations)
      .values({
        deputyId: a.deputyId,
        politicalGroupId: a.politicalGroupId,
        mandateId: a.mandateId,
        startDate: a.startDate,
        endDate: a.endDate ?? null,
        createdAt: new Date(),
      })
      .onConflictDoNothing({
        target: [
          schema.deputyGroupAffiliations.deputyId,
          schema.deputyGroupAffiliations.politicalGroupId,
          schema.deputyGroupAffiliations.mandateId,
          schema.deputyGroupAffiliations.startDate,
        ],
      });
    inserted++;
  }

  return { inserted };
}

// ─── Groupes politiques ──────────────────────────────────────────

export async function loadPoliticalGroups(
  deps: LoaderDeps,
  groups: AsyncIterable<ParsedPoliticalGroup>,
  _config: EtlConfig
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
  onProgress?: (processed: number) => void
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
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
            updatedAt: new Date(),
          };

          await trx
            .insert(schema.scrutins)
            .values({ ...scrutinValues, createdAt: new Date() })
            .onConflictDoUpdate({
              target: schema.scrutins.id,
              set: scrutinValues,
            });

          if (s.groupVotes.length > 0) {
            await trx
              .insert(schema.scrutinGroupVotes)
              .values(
                s.groupVotes.map((gv) => ({
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
                }))
              )
              .onConflictDoUpdate({
                target: [
                  schema.scrutinGroupVotes.scrutinId,
                  schema.scrutinGroupVotes.politicalGroupId,
                ],
                set: {
                  nombreMembresGroupe: sql`excluded.nombre_membres_groupe`,
                  positionMajoritaire: sql`excluded.position_majoritaire`,
                  nombrePour: sql`excluded.nombre_pour`,
                  nombreContre: sql`excluded.nombre_contre`,
                  nombreAbstentions: sql`excluded.nombre_abstentions`,
                  nombreNonVotants: sql`excluded.nombre_non_votants`,
                  nombreNonVotantsVolontaires:
                    sql`excluded.nombre_non_votants_volontaires`,
                },
              });
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
                causePositionVote: null,
                createdAt: new Date(),
              }))
            )
            .onConflictDoNothing({
              target: [
                schema.scrutinVotes.scrutinId,
                schema.scrutinVotes.deputyId,
              ],
            });
        }
      });

      inserted += batch.length;
    } catch (err) {
      errors += batch.length;
      console.error(
        `[loader] Batch failed (${batch.length} scrutins): ${err instanceof Error ? err.message : String(err)}`
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
