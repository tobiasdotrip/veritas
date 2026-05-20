import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { createCompareRepository } from "./repository.js";
import { createCompareService } from "./service.js";
import { CacheService, getRedis } from "../common/cache.js";
import { getDb } from "../../db/client.js";
import { DateString } from "../common/schemas.js";
import { ValidationError } from "../common/errors.js";
import { deputies } from "../../db/schema.js";
import { eq } from "drizzle-orm";

const CompareResponseSchema = z.object({
  deputies: z.array(
    z.object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      slug: z.string(),
      photoUrl: z.string().nullable(),
    })
  ),
  totalCommonVotes: z.number(),
  identicalVotes: z.number(),
  concordanceRate: z.number(),
  divergences: z.array(
    z.object({
      scrutinId: z.string(),
      numero: z.number(),
      dateScrutin: DateString,
      titre: z.string(),
      sortCode: z.enum(["adopté", "rejeté"]).nullable(),
      positions: z.array(
        z.object({
          deputyId: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          slug: z.string(),
          groupAbbreviation: z.string().nullable(),
          position: z.enum(["pour", "contre", "abstention", "nonVotant"]),
        })
      ),
    })
  ),
  pairwise: z.array(
    z.object({
      deputyAId: z.string(),
      deputyAName: z.string(),
      deputyBId: z.string(),
      deputyBName: z.string(),
      concordanceRate: z.number(),
      identicalVotes: z.number(),
      totalCommon: z.number(),
    })
  ),
});

const plugin: FastifyPluginAsyncZod = async function (fastify) {
  const db = getDb();
  const repo = createCompareRepository(db);
  const cache = new CacheService(getRedis());
  const service = createCompareService(repo, cache);

  async function resolveDeputyId(idOrSlug: string): Promise<string | null> {
    if (idOrSlug.startsWith("PA")) {
      const result = await db.select({ id: deputies.id }).from(deputies).where(eq(deputies.id, idOrSlug)).limit(1);
      const row = result[0];
      if (row) return row.id;
    }
    const result = await db.select({ id: deputies.id }).from(deputies).where(eq(deputies.slug, idOrSlug)).limit(1);
    return result[0]?.id ?? null;
  }

  fastify.route({
    method: "GET",
    url: "/compare",
    schema: {
      tags: ["Comparateur"],
      querystring: z.object({
        deputies: z
          .string()
          .min(3)
          .refine((val) => val.split(",").length >= 2 && val.split(",").length <= 5, {
            message: "2 à 5 députés requis (séparés par des virgules)",
          }),
        from: z.string().date().optional(),
        to: z.string().date().optional(),
        legislature: z.string().default("17"),
      }),
      response: {
        200: z.object({
          data: CompareResponseSchema,
        }),
      },
    },
    handler: async (req, reply) => {
      const { deputies: deputiesParam, from, to, legislature } = req.query;
      const idsOrSlugs = deputiesParam.split(",");
      const resolvedIds = await Promise.all(idsOrSlugs.map(resolveDeputyId));
      const deputyIds = resolvedIds.filter((id): id is string => id !== null);
      if (deputyIds.length < 2) {
        throw new ValidationError(
          "Could not resolve at least 2 valid deputy identifiers"
        );
      }
      const result = await service.compareDeputies(deputyIds, legislature, from, to);
      return reply.send({ data: result });
    },
  });
};

export default plugin;
