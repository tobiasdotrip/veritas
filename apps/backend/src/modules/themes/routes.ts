import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { eq, and, sql, desc } from "drizzle-orm";
import { getDb } from "../../db/client.js";
import { themes, scrutinThemes, scrutins } from "../../db/schema.js";

const ThemeListItemSchema = z.object({
  slug: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  scrutinsCount: z.number(),
});

const plugin: FastifyPluginAsyncZod = async function (fastify) {
  const db = getDb();

  fastify.route({
    method: "GET",
    url: "/themes",
    schema: {
      tags: ["Thématiques"],
      querystring: z.object({
        legislature: z.string().default("17"),
      }),
      response: {
        200: z.object({
          data: ThemeListItemSchema.array(),
        }),
      },
    },
    handler: async (req, reply) => {
      const { legislature } = req.query;

      const rows = await db
        .select({
          slug: themes.slug,
          label: themes.label,
          description: themes.description,
          scrutinsCount: sql<number>`count(${scrutins.id})::int`,
        })
        .from(themes)
        .leftJoin(scrutinThemes, eq(scrutinThemes.themeId, themes.id))
        .leftJoin(
          scrutins,
          and(
            eq(scrutinThemes.scrutinId, scrutins.id),
            eq(scrutins.legislature, legislature),
          ),
        )
        .groupBy(themes.id, themes.slug, themes.label, themes.description)
        .orderBy(desc(sql`count(${scrutins.id})`), themes.label);

      return reply.send({ data: rows });
    },
  });
};

export default plugin;
