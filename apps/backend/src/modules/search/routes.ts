import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { sql, desc, eq, and } from "drizzle-orm";
import { getDb } from "../../db/client.js";
import {
  deputies,
  scrutins,
  deputyGroupAffiliations,
  politicalGroups,
} from "../../db/schema.js";
import { DateString } from "../common/schemas.js";
import { rethrowTextSearchValidationError } from "../common/db-errors.js";

function toPrefixTsQuery(q: string): string {
  const safeQ = q.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  return safeQ ? `${safeQ}:*` : "";
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
        limit: z.coerce.number().min(1).max(20).default(10),
      }),
      response: {
        200: z.object({
          data: SuggestionSchema.array(),
        }),
      },
    },
    handler: async (req, reply) => {
      const { q, limit: maxResults } = req.query;
      const tsQuery = toPrefixTsQuery(q);
      if (!tsQuery) {
        return reply.send({ data: [] });
      }

      let deputyRows;
      let scrutinRows;
      try {
        deputyRows = await db
          .select({
            id: deputies.id,
            firstName: deputies.firstName,
            lastName: deputies.lastName,
            slug: deputies.slug,
            rank: sql<number>`ts_rank(
            to_tsvector('french', coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, '')),
            to_tsquery('french', ${tsQuery})
          )`,
          })
          .from(deputies)
          .where(
            sql`
            to_tsvector('french', coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, ''))
            @@ to_tsquery('french', ${tsQuery})
          `,
          )
          .orderBy(desc(sql`ts_rank`))
          .limit(maxResults);

        scrutinRows = await db
          .select({
            id: scrutins.id,
            numero: scrutins.numero,
            titre: scrutins.titre,
            slug: scrutins.id,
            rank: sql<number>`ts_rank(
            to_tsvector('french', coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, '')),
            to_tsquery('french', ${tsQuery})
          )`,
          })
          .from(scrutins)
          .where(
            sql`
            to_tsvector('french', coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, ''))
            @@ to_tsquery('french', ${tsQuery})
          `,
          )
          .orderBy(desc(sql`ts_rank`))
          .limit(maxResults);
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
      querystring: z.object({
        q: z.string().min(1).max(200),
        limit: z.coerce.number().min(1).max(20).default(10),
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
      const { q, limit: maxResults } = req.query;

      let deputyRows;
      let scrutinRows;
      try {
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
            to_tsvector('french', coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, ''))
            @@ plainto_tsquery('french', ${q})
          `,
          )
          .orderBy(
            desc(
              sql`ts_rank(
              to_tsvector('french', coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, '')),
              plainto_tsquery('french', ${q})
            )`,
            ),
          )
          .limit(maxResults);

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
            sql`
            to_tsvector('french', coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, ''))
            @@ plainto_tsquery('french', ${q})
          `,
          )
          .orderBy(
            desc(
              sql`ts_rank(
              to_tsvector('french', coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, '')),
              plainto_tsquery('french', ${q})
            )`,
            ),
          )
          .limit(maxResults);
      } catch (err) {
        rethrowTextSearchValidationError(err);
        throw err;
      }

      return reply.send({
        data: {
          deputies: deputyRows,
          scrutins: scrutinRows,
        },
        meta: {
          total: deputyRows.length + scrutinRows.length,
          hasMore: false,
        },
      });
    },
  });
};

export default plugin;
