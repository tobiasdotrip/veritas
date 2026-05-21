import { eq, and, sql, inArray, desc } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import {
  scrutinVotes,
  scrutins,
  deputies,
  politicalGroups,
} from "../../db/schema.js";

export function createCompareRepository(db: Database) {
  return {
    async getCommonVotes(
      deputyIds: string[],
      legislature: string,
      from?: string,
      to?: string,
    ) {
      const dateConditions = [eq(scrutins.legislature, legislature)];
      if (from) {
        dateConditions.push(sql`${scrutins.dateScrutin} >= ${new Date(from)}`);
      }
      if (to) {
        dateConditions.push(sql`${scrutins.dateScrutin} <= ${new Date(to)}`);
      }

      // CTE: scrutins where all deputies have voted (position != 'nonVotant')
      const commonScrutins = db.$with("common_scrutins").as(
        db
          .select({
            scrutinId: scrutinVotes.scrutinId,
          })
          .from(scrutinVotes)
          .innerJoin(scrutins, eq(scrutinVotes.scrutinId, scrutins.id))
          .where(
            and(
              inArray(scrutinVotes.deputyId, deputyIds),
              ...dateConditions,
              sql`${scrutinVotes.position} != 'nonVotant'`,
            ),
          )
          .groupBy(scrutinVotes.scrutinId)
          .having(
            sql`count(distinct ${scrutinVotes.deputyId}) = ${deputyIds.length}`,
          ),
      );

      // Get vote details for common scrutins
      const rows = await db
        .with(commonScrutins)
        .select({
          scrutinId: scrutins.id,
          numero: scrutins.numero,
          dateScrutin: scrutins.dateScrutin,
          titre: scrutins.titre,
          sortCode: scrutins.sortCode,
          deputyId: scrutinVotes.deputyId,
          deputyFirstName: deputies.firstName,
          deputyLastName: deputies.lastName,
          deputySlug: deputies.slug,
          groupAbbreviation: politicalGroups.abbreviation,
          position: scrutinVotes.position,
        })
        .from(commonScrutins)
        .innerJoin(scrutins, eq(commonScrutins.scrutinId, scrutins.id))
        .innerJoin(
          scrutinVotes,
          eq(scrutinVotes.scrutinId, commonScrutins.scrutinId),
        )
        .innerJoin(deputies, eq(scrutinVotes.deputyId, deputies.id))
        .innerJoin(
          politicalGroups,
          eq(scrutinVotes.politicalGroupId, politicalGroups.id),
        )
        .where(inArray(scrutinVotes.deputyId, deputyIds))
        .orderBy(desc(scrutins.dateScrutin), desc(scrutins.id));

      return rows;
    },

    async getDeputiesBrief(deputyIds: string[]) {
      const rows = await db
        .select({
          id: deputies.id,
          firstName: deputies.firstName,
          lastName: deputies.lastName,
          slug: deputies.slug,
          photoUrl: deputies.photoUrl,
        })
        .from(deputies)
        .where(inArray(deputies.id, deputyIds));

      return rows;
    },
  };
}

export type CompareRepository = ReturnType<typeof createCompareRepository>;
