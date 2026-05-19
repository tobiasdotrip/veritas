import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { createCompareRepository } from "./repository.js";
import { createCompareService } from "./service.js";
import { CacheService, getRedis } from "../common/cache.js";
import { getDb } from "../../db/client.js";
import { DateString } from "../common/schemas.js";

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

  fastify.route({
    method: "GET",
    url: "/compare",
    schema: {
      tags: ["Comparateur"],
      querystring: z.object({
        deputies: z
          .string()
          .regex(
            /^PA\d+(,PA\d+){1,4}$/,
            "2 à 5 députés requis (séparés par des virgules)"
          ),
        from: z.iso.date().optional(),
        to: z.iso.date().optional(),
        legislature: z.string().default("17"),
      }),
      response: {
        200: CompareResponseSchema,
      },
    },
    handler: async (req, reply) => {
      const { deputies: deputiesParam, from, to, legislature } = req.query;
      const deputyIds = deputiesParam.split(",");
      const result = await service.compareDeputies(deputyIds, legislature, from, to);
      return reply.send(result);
    },
  });
};

export default plugin;
