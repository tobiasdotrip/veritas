import { eq, and, sql, desc, asc, gte, lte, count } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import {
  deputies,
  deputyMandates,
  deputyGroupAffiliations,
  politicalGroups,
  scrutinVotes,
  scrutins,
  scrutinGroupVotes,
  scrutinThemes,
  themes,
} from "../../db/schema.js";
import { decodeCursor, buildCursorResponse } from "../common/pagination.js";
import type { CursorPaginationInput } from "../common/pagination.js";

export interface DeputySearchFilters {
  q?: string | undefined;
  department?: string | undefined;
  circo?: number | undefined;
  group?: string | undefined;
  legislature?: string | undefined;
}

export interface DeputyVoteFilters {
  from?: string | undefined;
  to?: string | undefined;
  type?: string | undefined;
  theme?: string | undefined;
  position?: "pour" | "contre" | "abstention" | "nonVotant" | undefined;
}

export function createDeputyRepository(db: Database) {
  return {
    async search(
      filters: DeputySearchFilters,
      limit: number,
      offset: number
    ) {
      const conditions: (ReturnType<typeof eq> | ReturnType<typeof sql<boolean>>)[] = [];

      if (filters.q) {
        conditions.push(
          sql`
            to_tsvector('french', coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, ''))
            @@ plainto_tsquery('french', ${filters.q})
          `
        );
      }
      if (filters.department) {
        conditions.push(eq(deputies.departmentId, filters.department));
      }
      if (filters.circo !== undefined) {
        conditions.push(eq(deputies.circoNumber, filters.circo));
      }
      if (filters.group) {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${deputyGroupAffiliations}
            WHERE ${deputyGroupAffiliations.deputyId} = ${deputies.id}
              AND ${deputyGroupAffiliations.politicalGroupId} = ${filters.group}
              AND ${deputyGroupAffiliations.endDate} IS NULL
          )`
        );
      }
      if (filters.legislature) {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${deputyMandates}
            WHERE ${deputyMandates.deputyId} = ${deputies.id}
              AND ${deputyMandates.legislature} = ${filters.legislature}
          )`
        );
      }

      const baseQuery = db
        .select({
          id: deputies.id,
          firstName: deputies.firstName,
          lastName: deputies.lastName,
          slug: deputies.slug,
          civility: deputies.civility,
          dateOfBirth: deputies.dateOfBirth,
          placeOfBirth: deputies.placeOfBirth,
          departmentId: deputies.departmentId,
          circoNumber: deputies.circoNumber,
          circoLabel: deputies.circoLabel,
          photoUrl: deputies.photoUrl,
          profession: deputies.profession,
        })
        .from(deputies)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(deputies.lastName), asc(deputies.firstName))
        .limit(limit)
        .offset(offset);

      const items = await baseQuery;

      const countResult = await db
        .select({ total: count() })
        .from(deputies)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0]?.total ?? 0;

      return { items, total };
    },

    async getById(id: string) {
      const result = await db
        .select()
        .from(deputies)
        .where(eq(deputies.id, id))
        .limit(1);

      return result[0] ?? null;
    },

    async getBySlug(slug: string) {
      const result = await db
        .select()
        .from(deputies)
        .where(eq(deputies.slug, slug))
        .limit(1);

      return result[0] ?? null;
    },

    async getWithDetails(id: string) {
      const deputyResult = await db
        .select()
        .from(deputies)
        .where(eq(deputies.id, id))
        .limit(1);

      const deputy = deputyResult[0];
      if (!deputy) return null;

      const mandates = await db
        .select()
        .from(deputyMandates)
        .where(eq(deputyMandates.deputyId, id))
        .orderBy(desc(deputyMandates.startDate));

      const currentAffiliation = await db
        .select({
          id: deputyGroupAffiliations.id,
          politicalGroupId: deputyGroupAffiliations.politicalGroupId,
          name: politicalGroups.name,
          abbreviation: politicalGroups.abbreviation,
          startDate: deputyGroupAffiliations.startDate,
          endDate: deputyGroupAffiliations.endDate,
        })
        .from(deputyGroupAffiliations)
        .innerJoin(politicalGroups, eq(deputyGroupAffiliations.politicalGroupId, politicalGroups.id))
        .where(
          and(
            eq(deputyGroupAffiliations.deputyId, id),
            sql`${deputyGroupAffiliations.endDate} IS NULL`
          )
        )
        .orderBy(desc(deputyGroupAffiliations.startDate))
        .limit(1);

      return {
        ...deputy,
        mandates,
        currentGroup: currentAffiliation[0] ?? null,
      };
    },

    async getVotes(
      deputyId: string,
      legislature: string,
      filters: DeputyVoteFilters,
      pagination: CursorPaginationInput
    ) {
      const { limit, cursor } = pagination;
      const conditions = [eq(scrutinVotes.deputyId, deputyId), eq(scrutins.legislature, legislature)];

      if (filters.from) {
        conditions.push(gte(scrutins.dateScrutin, new Date(filters.from)));
      }
      if (filters.to) {
        conditions.push(lte(scrutins.dateScrutin, new Date(filters.to)));
      }
      if (filters.type) {
        conditions.push(eq(scrutins.codeTypeVote, filters.type));
      }
      if (filters.position) {
        conditions.push(eq(scrutinVotes.position, filters.position));
      }
      if (filters.theme) {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${scrutinThemes}
            INNER JOIN ${themes} ON ${scrutinThemes.themeId} = ${themes.id}
            WHERE ${scrutinThemes.scrutinId} = ${scrutins.id}
              AND ${themes.slug} = ${filters.theme}
          )`
        );
      }
      if (cursor) {
        const decoded = decodeCursor(cursor);
        conditions.push(
          sql`(${scrutins.dateScrutin}, ${scrutins.id}) < (${new Date(decoded.date)}, ${decoded.id})`
        );
      }

      const rows = await db
        .select({
          voteId: scrutinVotes.id,
          position: scrutinVotes.position,
          parDelegation: scrutinVotes.parDelegation,
          causePositionVote: scrutinVotes.causePositionVote,
          scrutinId: scrutins.id,
          numero: scrutins.numero,
          dateScrutin: scrutins.dateScrutin,
          titre: scrutins.titre,
          sortCode: scrutins.sortCode,
          codeTypeVote: scrutins.codeTypeVote,
        })
        .from(scrutinVotes)
        .innerJoin(scrutins, eq(scrutinVotes.scrutinId, scrutins.id))
        .where(and(...conditions))
        .orderBy(desc(scrutins.dateScrutin), desc(scrutins.id))
        .limit(limit + 1);

      return buildCursorResponse(rows, limit, (item) => ({
        date: (item.dateScrutin as Date).toISOString(),
        id: item.scrutinId as string,
      }));
    },

    async getStats(deputyId: string, legislature: string) {
      const totalScrutinsResult = await db
        .select({ total: count() })
        .from(scrutins)
        .where(eq(scrutins.legislature, legislature));
      const totalScrutins = totalScrutinsResult[0]?.total ?? 0;

      const votesCastResult = await db
        .select({ total: count() })
        .from(scrutinVotes)
        .innerJoin(scrutins, eq(scrutinVotes.scrutinId, scrutins.id))
        .where(
          and(
            eq(scrutinVotes.deputyId, deputyId),
            eq(scrutins.legislature, legislature),
            sql`${scrutinVotes.position} != 'nonVotant'`
          )
        );
      const votesCast = votesCastResult[0]?.total ?? 0;

      const loyaltyResult = await db
        .select({ total: count() })
        .from(scrutinVotes)
        .innerJoin(scrutins, eq(scrutinVotes.scrutinId, scrutins.id))
        .innerJoin(
          scrutinGroupVotes,
          and(
            eq(scrutinVotes.scrutinId, scrutinGroupVotes.scrutinId),
            eq(scrutinVotes.politicalGroupId, scrutinGroupVotes.politicalGroupId)
          )
        )
        .where(
          and(
            eq(scrutinVotes.deputyId, deputyId),
            eq(scrutins.legislature, legislature),
            sql`${scrutinVotes.position} != 'nonVotant'`,
            sql`${scrutinVotes.position} = ${scrutinGroupVotes.positionMajoritaire}`
          )
        );
      const votesWithGroup = loyaltyResult[0]?.total ?? 0;

      const againstGroupResult = await db
        .select({ total: count() })
        .from(scrutinVotes)
        .innerJoin(scrutins, eq(scrutinVotes.scrutinId, scrutins.id))
        .innerJoin(
          scrutinGroupVotes,
          and(
            eq(scrutinVotes.scrutinId, scrutinGroupVotes.scrutinId),
            eq(scrutinVotes.politicalGroupId, scrutinGroupVotes.politicalGroupId)
          )
        )
        .where(
          and(
            eq(scrutinVotes.deputyId, deputyId),
            eq(scrutins.legislature, legislature),
            sql`${scrutinVotes.position} != 'nonVotant'`,
            sql`${scrutinVotes.position} != ${scrutinGroupVotes.positionMajoritaire}`,
            sql`${scrutinGroupVotes.positionMajoritaire} IS NOT NULL`
          )
        );
      const votesAgainstGroup = againstGroupResult[0]?.total ?? 0;

      return {
        totalScrutins,
        votesCast,
        participationRate: totalScrutins > 0 ? Number(((votesCast / totalScrutins) * 100).toFixed(2)) : 0,
        votesWithGroup,
        loyaltyRate: votesCast > 0 ? Number(((votesWithGroup / votesCast) * 100).toFixed(2)) : 0,
        votesAgainstGroup,
      };
    },
  };
}

export type DeputyRepository = ReturnType<typeof createDeputyRepository>;
