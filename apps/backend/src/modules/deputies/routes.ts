import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { createDeputyRepository } from "./repository.js";
import { createDeputyService } from "./service.js";
import { CacheService, getRedis } from "../common/cache.js";
import { getDb } from "../../db/client.js";
import { NotFoundError } from "../common/errors.js";
import { OffsetPaginationQuery, CursorPaginationQuery } from "../common/pagination.js";
import { DateString, NullableDateString } from "../common/schemas.js";

const DeputyResponseSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  slug: z.string(),
  civility: z.string().nullable(),
  dateOfBirth: NullableDateString,
  placeOfBirth: z.string().nullable(),
  departmentId: z.string().nullable(),
  circoNumber: z.number().nullable(),
  circoLabel: z.string().nullable(),
  photoUrl: z.string().nullable(),
  profession: z.string().nullable(),
});

const DeputyDetailResponseSchema = DeputyResponseSchema.extend({
  mandates: z.array(
    z.object({
      id: z.string(),
      legislature: z.string(),
      startDate: DateString,
      endDate: NullableDateString,
      departmentId: z.string().nullable(),
      circoNumber: z.number().nullable(),
      circoLabel: z.string().nullable(),
      electionCause: z.string().nullable(),
      endCause: z.string().nullable(),
    })
  ),
  currentGroup: z
    .object({
      id: z.number(),
      politicalGroupId: z.string(),
      name: z.string(),
      abbreviation: z.string().nullable(),
      startDate: DateString,
      endDate: NullableDateString,
    })
    .nullable(),
});

const DeputyVoteSchema = z.object({
  voteId: z.number(),
  position: z.enum(["pour", "contre", "abstention", "nonVotant"]),
  parDelegation: z.boolean().nullable(),
  causePositionVote: z.string().nullable(),
  scrutinId: z.string(),
  numero: z.number(),
  dateScrutin: DateString,
  titre: z.string(),
  sortCode: z.enum(["adopté", "rejeté"]).nullable(),
  codeTypeVote: z.string().nullable(),
});

const DeputyStatsSchema = z.object({
  totalScrutins: z.number(),
  votesCast: z.number(),
  participationRate: z.number(),
  votesWithGroup: z.number(),
  loyaltyRate: z.number(),
  votesAgainstGroup: z.number(),
});

async function resolveDeputyId(service: ReturnType<typeof createDeputyService>, idOrSlug: string) {
  if (idOrSlug.startsWith("PA")) {
    const deputy = await service.getDeputyById(idOrSlug);
    if (deputy) return deputy.id;
  }
  const deputy = await service.getDeputyBySlug(idOrSlug);
  return deputy.id;
}

const plugin: FastifyPluginAsyncZod = async function (fastify) {
  const db = getDb();
  const repo = createDeputyRepository(db);
  const cache = new CacheService(getRedis());
  const service = createDeputyService(repo, cache);

  fastify.route({
    method: "GET",
    url: "/deputies",
    schema: {
      tags: ["Députés"],
      querystring: z.object({
        q: z.string().min(1).max(100).optional(),
        department: z.string().length(2).optional(),
        circo: z.coerce.number().min(1).max(21).optional(),
        group: z.string().optional(),
        legislature: z.string().default("17"),
        ...OffsetPaginationQuery.shape,
      }),
      response: {
        200: z.object({
          data: DeputyResponseSchema.array(),
          total: z.number(),
          limit: z.number(),
          offset: z.number(),
        }),
      },
    },
    handler: async (req, reply) => {
      const { q, department, circo, group, legislature, limit, offset } = req.query;
      const result = await service.searchDeputies(
        { q, department, circo, group, legislature },
        limit,
        offset
      );
      return reply.send({
        data: result.items,
        total: result.total,
        limit,
        offset,
      });
    },
  });

  fastify.route({
    method: "GET",
    url: "/deputies/:id",
    schema: {
      tags: ["Députés"],
      params: z.object({ id: z.string() }),
      response: {
        200: DeputyDetailResponseSchema,
      },
    },
    handler: async (req, reply) => {
      const { id } = req.params;
      const deputyId = await resolveDeputyId(service, id);
      const deputy = await service.getDeputyById(deputyId);
      if (!deputy) {
        throw new NotFoundError("Deputy", id);
      }
      return reply.send(deputy);
    },
  });

  fastify.route({
    method: "GET",
    url: "/deputies/:id/votes",
    schema: {
      tags: ["Députés"],
      params: z.object({ id: z.string() }),
      querystring: z.object({
        from: z.string().date().optional(),
        to: z.string().date().optional(),
        type: z.string().optional(),
        theme: z.string().optional(),
        position: z.enum(["pour", "contre", "abstention", "nonVotant"]).optional(),
        legislature: z.string().default("17"),
        ...CursorPaginationQuery.shape,
      }),
      response: {
        200: z.object({
          data: DeputyVoteSchema.array(),
          nextCursor: z.string().nullable(),
          hasMore: z.boolean(),
        }),
      },
    },
    handler: async (req, reply) => {
      const { id } = req.params;
      const { from, to, type, theme, position, legislature, limit, cursor } = req.query;
      const deputyId = await resolveDeputyId(service, id);
      const result = await service.getDeputyVotes(
        deputyId,
        legislature,
        { from, to, type, theme, position },
        { limit, cursor }
      );
      return reply.send(result);
    },
  });

  fastify.route({
    method: "GET",
    url: "/deputies/:id/stats",
    schema: {
      tags: ["Députés"],
      params: z.object({ id: z.string() }),
      querystring: z.object({
        legislature: z.string().default("17"),
      }),
      response: {
        200: DeputyStatsSchema,
      },
    },
    handler: async (req, reply) => {
      const { id } = req.params;
      const { legislature } = req.query;
      const deputyId = await resolveDeputyId(service, id);
      const stats = await service.getDeputyStats(deputyId, legislature);
      return reply.send(stats);
    },
  });
};

export default plugin;
