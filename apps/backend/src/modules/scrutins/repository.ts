import { eq, and, sql, desc, asc, gte, lte, count, inArray } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import {
  scrutins,
  scrutinVotes,
  scrutinThemes,
  themes,
  deputies,
  politicalGroups,
  scrutinGroupVotes,
  scrutinAmendments,
  amendments,
} from "../../db/schema.js";
import { decodeCursor, buildCursorResponse } from "../common/pagination.js";
import type {
  CursorPaginationInput,
  OffsetPaginationInput,
} from "../common/pagination.js";
import { withTextSearchErrorHandling } from "../common/db-errors.js";

function formatAmendmentAuteurs(auteurs: unknown): string | null {
  if (typeof auteurs === "string") {
    const trimmed = auteurs.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!Array.isArray(auteurs)) {
    return null;
  }

  const labels = auteurs
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const auteur = entry as Record<string, unknown>;

      const libelle =
        typeof auteur.libelle === "string" ? auteur.libelle.trim() : "";
      if (libelle) return libelle;

      const prenom =
        typeof auteur.prenom === "string" ? auteur.prenom.trim() : "";
      const nom = typeof auteur.nom === "string" ? auteur.nom.trim() : "";
      const fullName = [prenom, nom].filter(Boolean).join(" ").trim();
      return fullName || null;
    })
    .filter((value): value is string => Boolean(value));

  if (labels.length === 0) return null;

  return [...new Set(labels)].join(" ; ");
}

export interface ScrutinSearchFilters {
  q?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  type?: string | undefined;
  theme?: string | undefined;
  sort?: "date_desc" | "date_asc" | "relevance" | undefined;
}

export interface ScrutinVoteFilters {
  group?: string | undefined;
  position?: "pour" | "contre" | "abstention" | "nonVotant" | undefined;
}

export function createScrutinRepository(db: Database) {
  return {
    async search(
      legislature: string,
      filters: ScrutinSearchFilters,
      pagination: CursorPaginationInput,
    ) {
      const { limit, cursor } = pagination;
      const conditions = [eq(scrutins.legislature, legislature)];

      if (filters.q) {
        conditions.push(
          sql`
            to_tsvector('french', coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, ''))
            @@ plainto_tsquery('french', ${filters.q})
          `,
        );
      }
      if (filters.from) {
        conditions.push(gte(scrutins.dateScrutin, new Date(filters.from)));
      }
      if (filters.to) {
        conditions.push(lte(scrutins.dateScrutin, new Date(filters.to)));
      }
      if (filters.type) {
        conditions.push(eq(scrutins.codeTypeVote, filters.type));
      }
      if (filters.theme) {
        conditions.push(
          inArray(
            scrutins.id,
            db
              .select({ scrutinId: scrutinThemes.scrutinId })
              .from(scrutinThemes)
              .innerJoin(themes, eq(scrutinThemes.themeId, themes.id))
              .where(eq(themes.slug, filters.theme)),
          ),
        );
      }
      if (cursor) {
        const decoded = decodeCursor(cursor);
        if (filters.sort === "date_asc") {
          conditions.push(
            sql`(${scrutins.dateScrutin}, ${scrutins.id}) > (${decoded.date}::date, ${decoded.id})`,
          );
        } else {
          conditions.push(
            sql`(${scrutins.dateScrutin}, ${scrutins.id}) < (${decoded.date}::date, ${decoded.id})`,
          );
        }
      }

      const orderBy =
        filters.sort === "date_asc"
          ? [asc(scrutins.dateScrutin), asc(scrutins.id)]
          : filters.sort === "relevance" && filters.q
            ? [
                sql`ts_rank(
                to_tsvector('french', coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, '')),
                plainto_tsquery('french', ${filters.q})
              ) DESC`,
              ]
            : [desc(scrutins.dateScrutin), desc(scrutins.id)];

      const runSearch = async () => {
        const rows = await db
          .select({
            id: scrutins.id,
            legislature: scrutins.legislature,
            numero: scrutins.numero,
            dateScrutin: scrutins.dateScrutin,
            titre: scrutins.titre,
            sortCode: scrutins.sortCode,
            nombrePour: scrutins.nombrePour,
            nombreContre: scrutins.nombreContre,
            nombreAbstentions: scrutins.nombreAbstentions,
            nombreNonVotants: scrutins.nombreNonVotants,
            codeTypeVote: scrutins.codeTypeVote,
            demandeur: scrutins.demandeur,
          })
          .from(scrutins)
          .where(and(...conditions))
          .orderBy(...orderBy)
          .limit(limit + 1);

        return buildCursorResponse(rows, limit, (item) => ({
          date: (item.dateScrutin as Date).toISOString().slice(0, 10),
          id: item.id as string,
        }));
      };

      return filters.q ? withTextSearchErrorHandling(runSearch) : runSearch();
    },

    async getById(id: string) {
      const result = await db
        .select()
        .from(scrutins)
        .where(eq(scrutins.id, id))
        .limit(1);

      return result[0] ?? null;
    },

    async getWithDetails(id: string) {
      const scrutinResult = await db
        .select()
        .from(scrutins)
        .where(eq(scrutins.id, id))
        .limit(1);

      const scrutin = scrutinResult[0];
      if (!scrutin) return null;

      const themeRows = await db
        .select({
          id: themes.id,
          slug: themes.slug,
          label: themes.label,
          confidence: scrutinThemes.confidence,
        })
        .from(scrutinThemes)
        .innerJoin(themes, eq(scrutinThemes.themeId, themes.id))
        .where(eq(scrutinThemes.scrutinId, id));

      const groupVotes = await db
        .select({
          id: scrutinGroupVotes.id,
          politicalGroupId: scrutinGroupVotes.politicalGroupId,
          name: politicalGroups.name,
          abbreviation: politicalGroups.abbreviation,
          nombreMembresGroupe: scrutinGroupVotes.nombreMembresGroupe,
          positionMajoritaire: scrutinGroupVotes.positionMajoritaire,
          nombrePour: scrutinGroupVotes.nombrePour,
          nombreContre: scrutinGroupVotes.nombreContre,
          nombreAbstentions: scrutinGroupVotes.nombreAbstentions,
          nombreNonVotants: scrutinGroupVotes.nombreNonVotants,
        })
        .from(scrutinGroupVotes)
        .innerJoin(
          politicalGroups,
          eq(scrutinGroupVotes.politicalGroupId, politicalGroups.id),
        )
        .where(eq(scrutinGroupVotes.scrutinId, id));

      // Join scrutin_amendments → amendments to get the linked amendment
      const amendmentRows = await db
        .select({
          id: amendments.id,
          numero: amendments.numero,
          dispositif: amendments.dispositif,
          exposeSommaire: amendments.exposeSommaire,
          sortCode: amendments.sortCode,
          articleRef: amendments.articleRef,
          auteurs: amendments.auteurs,
          matchMethod: scrutinAmendments.matchMethod,
          confidence: scrutinAmendments.confidence,
        })
        .from(scrutinAmendments)
        .innerJoin(amendments, eq(scrutinAmendments.amendmentId, amendments.id))
        .where(eq(scrutinAmendments.scrutinId, id))
        .limit(1);

      const amendmentRow = amendmentRows[0] ?? null;
      const amendment = amendmentRow
        ? {
            ...amendmentRow,
            auteurs: formatAmendmentAuteurs(amendmentRow.auteurs),
          }
        : null;

      return {
        ...scrutin,
        themes: themeRows,
        groupVotes,
        amendment,
      };
    },

    async getVotes(
      scrutinId: string,
      filters: ScrutinVoteFilters,
      pagination: OffsetPaginationInput,
    ) {
      const { limit, offset } = pagination;
      const conditions = [eq(scrutinVotes.scrutinId, scrutinId)];

      if (filters.group) {
        conditions.push(eq(scrutinVotes.politicalGroupId, filters.group));
      }
      if (filters.position) {
        conditions.push(eq(scrutinVotes.position, filters.position));
      }

      const rows = await db
        .select({
          voteId: scrutinVotes.id,
          position: scrutinVotes.position,
          parDelegation: scrutinVotes.parDelegation,
          causePositionVote: scrutinVotes.causePositionVote,
          deputyId: deputies.id,
          deputyFirstName: deputies.firstName,
          deputyLastName: deputies.lastName,
          deputySlug: deputies.slug,
          deputyPhotoUrl: deputies.photoUrl,
          groupId: politicalGroups.id,
          groupName: politicalGroups.name,
          groupAbbreviation: politicalGroups.abbreviation,
        })
        .from(scrutinVotes)
        .innerJoin(deputies, eq(scrutinVotes.deputyId, deputies.id))
        .innerJoin(
          politicalGroups,
          eq(scrutinVotes.politicalGroupId, politicalGroups.id),
        )
        .where(and(...conditions))
        .orderBy(asc(deputies.lastName), asc(deputies.firstName))
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ total: count() })
        .from(scrutinVotes)
        .where(and(...conditions));

      const total = countResult[0]?.total ?? 0;

      return { rows, total };
    },
  };
}

export type ScrutinRepository = ReturnType<typeof createScrutinRepository>;
