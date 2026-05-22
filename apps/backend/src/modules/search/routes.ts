import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ThemeSlugOptional } from "@veritas/shared/schemas";
import { sql, desc, eq, and, inArray } from "drizzle-orm";
import { getDb } from "../../db/client.js";
import {
  deputies,
  scrutins,
  deputyGroupAffiliations,
  politicalGroups,
  scrutinThemes,
  themes,
} from "../../db/schema.js";
import { DateString } from "../common/schemas.js";
import { rethrowTextSearchValidationError } from "../common/db-errors.js";
import { toPrefixTsQuery } from "./ts-query.js";
import {
  shouldUseTrigramFallback,
  TRIGRAM_SIMILARITY_THRESHOLD,
} from "./trigram-search.js";
import type { Database } from "../../db/client.js";

function themeScrutinIds(db: Database, themeSlug: string) {
  return db
    .select({ scrutinId: scrutinThemes.scrutinId })
    .from(scrutinThemes)
    .innerJoin(themes, eq(scrutinThemes.themeId, themes.id))
    .where(eq(themes.slug, themeSlug));
}

const SuggestionSchema = z.object({
  type: z.enum(["deputy", "scrutin"]),
  id: z.string(),
  label: z.string(),
  slug: z.string(),
});

const SearchDeputyResultSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  slug: z.string(),
  photoUrl: z.string().nullable(),
  circoLabel: z.string().nullable(),
  departmentId: z.string().nullable(),
  groupAbbreviation: z.string().nullable(),
});

const SearchScrutinResultSchema = z.object({
  id: z.string(),
  numero: z.number(),
  dateScrutin: DateString,
  titre: z.string(),
  sortCode: z.enum(["adopté", "rejeté"]).nullable(),
  nombrePour: z.number().nullable(),
  nombreContre: z.number().nullable(),
  nombreAbstentions: z.number().nullable(),
});

const SearchPayloadSchema = z.object({
  deputies: SearchDeputyResultSchema.array(),
  scrutins: SearchScrutinResultSchema.array(),
});

const plugin: FastifyPluginAsyncZod = async function (fastify) {
  const db = getDb();

  fastify.route({
    method: "GET",
    url: "/search/suggestions",
    schema: {
      tags: ["Recherche"],
      querystring: z.object({
        q: z.string().min(1).max(100),
        theme: ThemeSlugOptional,
        limit: z.coerce.number().min(1).max(20).default(10),
      }),
      response: {
        200: z.object({
          data: SuggestionSchema.array(),
        }),
      },
    },
    handler: async (req, reply) => {
      const { q, theme, limit: maxResults } = req.query;
      const useTrigram = shouldUseTrigramFallback(q);
      const tsQuery = toPrefixTsQuery(q);
      if (!useTrigram && !tsQuery) {
        return reply.send({ data: [] });
      }

      const scrutinThemeFilter = theme
        ? inArray(scrutins.id, themeScrutinIds(db, theme))
        : undefined;

      let deputyRows;
      let scrutinRows;
      try {
        if (useTrigram) {
          deputyRows = await db
            .select({
              id: deputies.id,
              firstName: deputies.firstName,
              lastName: deputies.lastName,
              slug: deputies.slug,
              rank: sql<number>`word_similarity(
                unaccent(${q}),
                unaccent(coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, ''))
              )`,
            })
            .from(deputies)
            .where(
              sql`word_similarity(
                unaccent(${q}),
                unaccent(coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, ''))
              ) > ${TRIGRAM_SIMILARITY_THRESHOLD}`,
            )
            .orderBy(
              desc(
                sql`word_similarity(
                  unaccent(${q}),
                  unaccent(coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, ''))
                )`,
              ),
            )
            .limit(maxResults);

          scrutinRows = await db
            .select({
              id: scrutins.id,
              numero: scrutins.numero,
              titre: scrutins.titre,
              slug: scrutins.id,
              rank: sql<number>`word_similarity(
                unaccent(${q}),
                unaccent(coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, ''))
              )`,
            })
            .from(scrutins)
            .where(
              scrutinThemeFilter
                ? and(
                    sql`word_similarity(
                      unaccent(${q}),
                      unaccent(coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, ''))
                    ) > ${TRIGRAM_SIMILARITY_THRESHOLD}`,
                    scrutinThemeFilter,
                  )
                : sql`word_similarity(
                    unaccent(${q}),
                    unaccent(coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, ''))
                  ) > ${TRIGRAM_SIMILARITY_THRESHOLD}`,
            )
            .orderBy(
              desc(
                sql`word_similarity(
                  unaccent(${q}),
                  unaccent(coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, ''))
                )`,
              ),
            )
            .limit(maxResults);
        } else {
        deputyRows = await db
          .select({
            id: deputies.id,
            firstName: deputies.firstName,
            lastName: deputies.lastName,
            slug: deputies.slug,
            rank: sql<number>`ts_rank(
            to_tsvector('french', unaccent(coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, ''))),
            to_tsquery('french', ${tsQuery})
          ) / greatest(length(unaccent(coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, ''))), 1)`,
          })
          .from(deputies)
          .where(
            sql`
            to_tsvector('french', unaccent(coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, '')))
            @@ to_tsquery('french', ${tsQuery})
          `,
          )
          .orderBy(
            desc(
              sql`ts_rank(
            to_tsvector('french', unaccent(coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, ''))),
            to_tsquery('french', ${tsQuery})
          ) / greatest(length(unaccent(coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, ''))), 1)`,
            ),
          )
          .limit(maxResults);

        scrutinRows = await db
          .select({
            id: scrutins.id,
            numero: scrutins.numero,
            titre: scrutins.titre,
            slug: scrutins.id,
            rank: sql<number>`ts_rank(
            to_tsvector('french', unaccent(coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, ''))),
            to_tsquery('french', ${tsQuery})
          ) / greatest(length(unaccent(coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, ''))), 1)`,
          })
          .from(scrutins)
          .where(
            scrutinThemeFilter
              ? and(
                  sql`
            to_tsvector('french', unaccent(coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, '')))
            @@ to_tsquery('french', ${tsQuery})
          `,
                  scrutinThemeFilter,
                )
              : sql`
            to_tsvector('french', unaccent(coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, '')))
            @@ to_tsquery('french', ${tsQuery})
          `,
          )
          .orderBy(
            desc(
              sql`ts_rank(
            to_tsvector('french', unaccent(coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, ''))),
            to_tsquery('french', ${tsQuery})
          ) / greatest(length(unaccent(coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, ''))), 1)`,
            ),
          )
          .limit(maxResults);
        }
      } catch (err) {
        rethrowTextSearchValidationError(err);
        throw err;
      }

      const suggestions: z.infer<typeof SuggestionSchema>[] = [
        ...deputyRows.map((d) => ({
          type: "deputy" as const,
          id: d.id,
          label: `${d.firstName} ${d.lastName}`,
          slug: d.slug,
          rank: d.rank,
        })),
        ...scrutinRows.map((s) => ({
          type: "scrutin" as const,
          id: s.id,
          label: s.titre,
          slug: s.slug,
          rank: s.rank,
        })),
      ]
        .sort((a, b) => b.rank - a.rank)
        .slice(0, maxResults)
        .map(({ rank: _rank, ...item }) => item);

      return reply.send({ data: suggestions });
    },
  });

  fastify.route({
    method: "GET",
    url: "/search",
    schema: {
      tags: ["Recherche"],
      querystring: z
        .object({
          q: z.string().min(1).max(200).optional(),
          theme: ThemeSlugOptional,
          limit: z.coerce.number().min(1).max(20).default(10),
        })
        .refine((data) => data.q ?? data.theme, {
          message: "Either q or theme is required",
        }),
      response: {
        200: z.object({
          data: SearchPayloadSchema,
          meta: z.object({
            total: z.number(),
            hasMore: z.boolean(),
          }),
        }),
      },
    },
    handler: async (req, reply) => {
      const { q, theme, limit: maxResults } = req.query;

      let deputyRows;
      let scrutinRows;

      try {
        if (q) {
          if (shouldUseTrigramFallback(q)) {
            deputyRows = await db
              .select({
                id: deputies.id,
                firstName: deputies.firstName,
                lastName: deputies.lastName,
                slug: deputies.slug,
                photoUrl: deputies.photoUrl,
                circoLabel: deputies.circoLabel,
                departmentId: deputies.departmentId,
                groupAbbreviation: politicalGroups.abbreviation,
              })
              .from(deputies)
              .leftJoin(
                deputyGroupAffiliations,
                and(
                  eq(deputyGroupAffiliations.deputyId, deputies.id),
                  sql`${deputyGroupAffiliations.endDate} IS NULL`,
                ),
              )
              .leftJoin(
                politicalGroups,
                eq(deputyGroupAffiliations.politicalGroupId, politicalGroups.id),
              )
              .where(
                sql`word_similarity(
                  unaccent(${q}),
                  unaccent(coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, ''))
                ) > ${TRIGRAM_SIMILARITY_THRESHOLD}`,
              )
              .orderBy(
                desc(
                  sql`word_similarity(
                    unaccent(${q}),
                    unaccent(coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, ''))
                  )`,
                ),
              )
              .limit(maxResults);
          } else {
          deputyRows = await db
            .select({
              id: deputies.id,
              firstName: deputies.firstName,
              lastName: deputies.lastName,
              slug: deputies.slug,
              photoUrl: deputies.photoUrl,
              circoLabel: deputies.circoLabel,
              departmentId: deputies.departmentId,
              groupAbbreviation: politicalGroups.abbreviation,
            })
            .from(deputies)
            .leftJoin(
              deputyGroupAffiliations,
              and(
                eq(deputyGroupAffiliations.deputyId, deputies.id),
                sql`${deputyGroupAffiliations.endDate} IS NULL`,
              ),
            )
            .leftJoin(
              politicalGroups,
              eq(deputyGroupAffiliations.politicalGroupId, politicalGroups.id),
            )
            .where(
              sql`
            to_tsvector('french', unaccent(coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, '')))
            @@ plainto_tsquery('french', unaccent(${q}))
          `,
            )
            .orderBy(
              desc(
                sql`ts_rank(
              to_tsvector('french', unaccent(coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, ''))),
              plainto_tsquery('french', unaccent(${q}))
            ) / greatest(length(unaccent(coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, ''))), 1)`,
              ),
            )
            .limit(maxResults);
          }
        }

        const scrutinThemeFilter = theme
          ? inArray(scrutins.id, themeScrutinIds(db, theme))
          : undefined;

        if (q) {
          scrutinRows = await db
            .select({
              id: scrutins.id,
              numero: scrutins.numero,
              dateScrutin: scrutins.dateScrutin,
              titre: scrutins.titre,
              sortCode: scrutins.sortCode,
              nombrePour: scrutins.nombrePour,
              nombreContre: scrutins.nombreContre,
              nombreAbstentions: scrutins.nombreAbstentions,
            })
            .from(scrutins)
            .where(
              scrutinThemeFilter
                ? and(
                    sql`
            to_tsvector('french', unaccent(coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, '')))
            @@ plainto_tsquery('french', unaccent(${q}))
          `,
                    scrutinThemeFilter,
                  )
                : sql`
            to_tsvector('french', unaccent(coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, '')))
            @@ plainto_tsquery('french', unaccent(${q}))
          `,
            )
            .orderBy(
              desc(
                sql`ts_rank(
              to_tsvector('french', unaccent(coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, ''))),
              plainto_tsquery('french', unaccent(${q}))
            ) / greatest(length(unaccent(coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, ''))), 1)`,
              ),
            )
            .limit(maxResults);
        } else if (theme) {
          scrutinRows = await db
            .select({
              id: scrutins.id,
              numero: scrutins.numero,
              dateScrutin: scrutins.dateScrutin,
              titre: scrutins.titre,
              sortCode: scrutins.sortCode,
              nombrePour: scrutins.nombrePour,
              nombreContre: scrutins.nombreContre,
              nombreAbstentions: scrutins.nombreAbstentions,
            })
            .from(scrutins)
            .where(scrutinThemeFilter!)
            .orderBy(desc(scrutins.dateScrutin), desc(scrutins.id))
            .limit(maxResults);
        }
      } catch (err) {
        rethrowTextSearchValidationError(err);
        throw err;
      }

      return reply.send({
        data: {
          deputies: deputyRows ?? [],
          scrutins: scrutinRows ?? [],
        },
        meta: {
          total: (deputyRows?.length ?? 0) + (scrutinRows?.length ?? 0),
          hasMore: false,
        },
      });
    },
  });
};

export default plugin;
