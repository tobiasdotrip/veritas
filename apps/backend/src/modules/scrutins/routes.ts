import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ThemeSlugOptional } from "@veritas/shared/schemas";
import { createScrutinRepository } from "./repository.js";
import { createScrutinService } from "./service.js";
import { CacheService, getRedis } from "../common/cache.js";
import { getDb } from "../../db/client.js";
import { CursorPaginationQuery } from "../common/pagination.js";
import { DateString } from "../common/schemas.js";

const ScrutinSchema = z.object({
  id: z.string(),
  legislature: z.string(),
  numero: z.number(),
  dateScrutin: DateString,
  titre: z.string(),
  sortCode: z.enum(["adopté", "rejeté"]).nullable(),
  nombrePour: z.number().nullable(),
  nombreContre: z.number().nullable(),
  nombreAbstentions: z.number().nullable(),
  nombreNonVotants: z.number().nullable(),
  codeTypeVote: z.string().nullable(),
  demandeur: z.string().nullable(),
});

const AmendmentSchema = z.object({
  id: z.string(),
  numero: z.string(),
  dispositif: z.string().nullable(),
  exposeSommaire: z.string().nullable(),
  sortCode: z.string().nullable(),
  articleRef: z.string().nullable(),
  auteurs: z.string().nullable(),
  matchMethod: z.string(),
  confidence: z.string().nullable(),
});

const ScrutinDetailSchema = ScrutinSchema.extend({
  libelleTypeVote: z.string().nullable(),
  amendment: AmendmentSchema.nullable(),
  themes: z.array(
    z.object({
      id: z.number(),
      slug: z.string(),
      label: z.string(),
      confidence: z.string().nullable(),
    }),
  ),
  groupVotes: z.array(
    z.object({
      id: z.number(),
      politicalGroupId: z.string(),
      name: z.string(),
      abbreviation: z.string().nullable(),
      nombreMembresGroupe: z.number().nullable(),
      positionMajoritaire: z.string().nullable(),
      nombrePour: z.number().nullable(),
      nombreContre: z.number().nullable(),
      nombreAbstentions: z.number().nullable(),
      nombreNonVotants: z.number().nullable(),
    }),
  ),
});

const ScrutinVoteSchema = z.object({
  voteId: z.number(),
  position: z.enum(["pour", "contre", "abstention", "nonVotant"]),
  parDelegation: z.boolean().nullable(),
  causePositionVote: z.string().nullable(),
  deputyId: z.string(),
  deputyFirstName: z.string(),
  deputyLastName: z.string(),
  deputySlug: z.string(),
  groupId: z.string(),
  groupName: z.string(),
  groupAbbreviation: z.string().nullable(),
  deputyPhotoUrl: z.string().nullable(),
});

const plugin: FastifyPluginAsyncZod = async function (fastify) {
  const db = getDb();
  const repo = createScrutinRepository(db);
  const cache = new CacheService(await getRedis());
  const service = createScrutinService(repo, cache);

  fastify.route({
    method: "GET",
    url: "/scrutins",
    schema: {
      tags: ["Scrutins"],
      querystring: z.object({
        q: z.string().min(1).max(200).optional(),
        from: z.iso.date().optional(),
        to: z.iso.date().optional(),
        type: z.string().optional(),
        theme: ThemeSlugOptional,
        sort: z
          .enum(["date_desc", "date_asc", "relevance"])
          .default("date_desc"),
        legislature: z.string().default("17"),
        ...CursorPaginationQuery.shape,
      }),
      response: {
        200: z.object({
          data: ScrutinSchema.array(),
          meta: z.object({
            nextCursor: z.string().nullable(),
            hasMore: z.boolean(),
          }),
        }),
      },
    },
    handler: async (req, reply) => {
      const { q, from, to, type, theme, sort, legislature, limit, cursor } =
        req.query;
      const result = await service.searchScrutins(
        legislature,
        { q, from, to, type, theme, sort },
        { limit, cursor },
      );
      return reply.send({
        data: result.data,
        meta: { nextCursor: result.nextCursor, hasMore: result.hasMore },
      });
    },
  });

  fastify.route({
    method: "GET",
    url: "/scrutins/:id",
    schema: {
      tags: ["Scrutins"],
      params: z.object({ id: z.string() }),
      response: {
        200: z.object({
          data: ScrutinDetailSchema,
        }),
      },
    },
    handler: async (req, reply) => {
      const { id } = req.params;
      const scrutin = await service.getScrutinById(id);
      return reply.send({ data: scrutin });
    },
  });

  fastify.route({
    method: "GET",
    url: "/scrutins/:id/votes",
    schema: {
      tags: ["Scrutins"],
      params: z.object({ id: z.string() }),
      querystring: z.object({
        group: z.string().optional(),
        position: z
          .enum(["pour", "contre", "abstention", "nonVotant"])
          .optional(),
        limit: z.coerce.number().min(1).max(600).default(50),
        offset: z.coerce.number().min(0).default(0),
      }),
      response: {
        200: z.object({
          data: ScrutinVoteSchema.array(),
          total: z.number(),
          limit: z.number(),
          offset: z.number(),
        }),
      },
    },
    handler: async (req, reply) => {
      const { id } = req.params;
      const { group, position, limit, offset } = req.query;
      const result = await service.getScrutinVotes(
        id,
        { group, position },
        { limit, offset },
      );
      return reply.send({
        data: result.rows,
        total: result.total,
        limit,
        offset,
      });
    },
  });
};

export default plugin;
