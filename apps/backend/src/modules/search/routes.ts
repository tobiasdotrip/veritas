import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { sql, desc } from "drizzle-orm";
import { getDb } from "../../db/client.js";
import { deputies, scrutins } from "../../db/schema.js";
import { DateString } from "../common/schemas.js";

const SuggestionSchema = z.object({
  type: z.enum(["deputy", "scrutin"]),
  id: z.string(),
  label: z.string(),
  slug: z.string(),
});

const SearchResultSchema = z.object({
  deputies: z.array(
    z.object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      slug: z.string(),
      photoUrl: z.string().nullable(),
      departmentId: z.string().nullable(),
      circoNumber: z.number().nullable(),
    })
  ),
  scrutins: z.array(
    z.object({
      id: z.string(),
      numero: z.number(),
      dateScrutin: DateString,
      titre: z.string(),
      sortCode: z.enum(["adopté", "rejeté"]).nullable(),
    })
  ),
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
      const tsQuery = `${q}:*`;

      const deputyRows = await db
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
          `
        )
        .orderBy(desc(sql`ts_rank`))
        .limit(maxResults);

      const scrutinRows = await db
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
          `
        )
        .orderBy(desc(sql`ts_rank`))
        .limit(maxResults);

      const suggestions: z.infer<typeof SuggestionSchema>[] = [
        ...deputyRows.map((d) => ({
          type: "deputy" as const,
          id: d.id,
          label: `${d.firstName} ${d.lastName}`,
          slug: d.slug,
        })),
        ...scrutinRows.map((s) => ({
          type: "scrutin" as const,
          id: s.id,
          label: s.titre,
          slug: s.slug,
        })),
      ]
        .sort(() => 0) // keep original DB ordering per type
        .slice(0, maxResults);

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
        200: SearchResultSchema.extend({
          meta: z.object({
            total: z.number(),
            hasMore: z.boolean(),
          }),
        }),
      },
    },
    handler: async (req, reply) => {
      const { q, limit: maxResults } = req.query;

      const deputyRows = await db
        .select({
          id: deputies.id,
          firstName: deputies.firstName,
          lastName: deputies.lastName,
          slug: deputies.slug,
          photoUrl: deputies.photoUrl,
          departmentId: deputies.departmentId,
          circoNumber: deputies.circoNumber,
        })
        .from(deputies)
        .where(
          sql`
            to_tsvector('french', coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, ''))
            @@ plainto_tsquery('french', ${q})
          `
        )
        .orderBy(
          desc(
            sql`ts_rank(
              to_tsvector('french', coalesce(${deputies.lastName}, '') || ' ' || coalesce(${deputies.firstName}, '')),
              plainto_tsquery('french', ${q})
            )`
          )
        )
        .limit(maxResults);

      const scrutinRows = await db
        .select({
          id: scrutins.id,
          numero: scrutins.numero,
          dateScrutin: scrutins.dateScrutin,
          titre: scrutins.titre,
          sortCode: scrutins.sortCode,
        })
        .from(scrutins)
        .where(
          sql`
            to_tsvector('french', coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, ''))
            @@ plainto_tsquery('french', ${q})
          `
        )
        .orderBy(
          desc(
            sql`ts_rank(
              to_tsvector('french', coalesce(${scrutins.titre}, '') || ' ' || coalesce(${scrutins.objet}, '')),
              plainto_tsquery('french', ${q})
            )`
          )
        )
        .limit(maxResults);

      return reply.send({
        deputies: deputyRows,
        scrutins: scrutinRows,
        meta: {
          total: deputyRows.length + scrutinRows.length,
          hasMore: false,
        },
      });
    },
  });
};

export default plugin;
