import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ThemeSlugOptional } from "@veritas/shared/schemas";
import { createDeputyRepository } from "./repository.js";
import { createDeputyService } from "./service.js";
import { CacheService, getRedis } from "../common/cache.js";
import { getDb } from "../../db/client.js";
import { NotFoundError } from "../common/errors.js";
import {
  OffsetPaginationQuery,
  CursorPaginationQuery,
} from "../common/pagination.js";
import { DateString, NullableDateString } from "../common/schemas.js";

const DeputyStatsSchema = z.object({
  totalScrutins: z.number(),
  votesCast: z.number(),
  participationRate: z.number(),
  votesWithGroup: z.number(),
  loyaltyRate: z.number(),
  votesAgainstGroup: z.number(),
});

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

const DeputyProfileResponseSchema = DeputyResponseSchema.extend({
  groupName: z.string().nullable(),
  groupAbbreviation: z.string().nullable(),
  mandateStart: NullableDateString,
  mandateEnd: NullableDateString,
  stats: DeputyStatsSchema.nullable(),
});

function toIsoDateString(
  value: Date | string | null | undefined,
): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function buildDeputyProfile(
  deputy: NonNullable<
    Awaited<ReturnType<ReturnType<typeof createDeputyService>["getDeputyById"]>>
  >,
  stats: Awaited<
    ReturnType<ReturnType<typeof createDeputyService>["getDeputyStats"]>
  >,
  legislature: string,
) {
  const mandate =
    deputy.mandates.find((m) => m.legislature === legislature) ??
    deputy.mandates[0];

  return {
    id: deputy.id,
    firstName: deputy.firstName,
    lastName: deputy.lastName,
    slug: deputy.slug,
    civility: deputy.civility,
    dateOfBirth: toIsoDateString(deputy.dateOfBirth),
    placeOfBirth: deputy.placeOfBirth,
    departmentId: deputy.departmentId,
    circoNumber: deputy.circoNumber,
    circoLabel: deputy.circoLabel,
    photoUrl: deputy.photoUrl,
    profession: deputy.profession,
    groupName: deputy.currentGroup?.name ?? null,
    groupAbbreviation: deputy.currentGroup?.abbreviation ?? null,
    mandateStart: toIsoDateString(mandate?.startDate),
    mandateEnd: toIsoDateString(mandate?.endDate ?? null),
    stats,
  };
}

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
  groupPosition: z.string().nullable(),
  alignment: z.enum(["aligned", "opposed", "neutral"]),
});

async function resolveDeputyId(
  service: ReturnType<typeof createDeputyService>,
  idOrSlug: string,
) {
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
  const cache = new CacheService(await getRedis());
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
      const { q, department, circo, group, legislature, limit, offset } =
        req.query;
      const result = await service.searchDeputies(
        { q, department, circo, group, legislature },
        limit,
        offset,
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
      querystring: z.object({
        legislature: z.string().default("17"),
      }),
      response: {
        200: z.object({
          data: DeputyProfileResponseSchema,
        }),
      },
    },
    handler: async (req, reply) => {
      const { id } = req.params;
      const { legislature } = req.query;
      const deputyId = await resolveDeputyId(service, id);
      const deputy = await service.getDeputyById(deputyId);
      if (!deputy) {
        throw new NotFoundError("Deputy", id);
      }
      const stats = await service.getDeputyStats(deputyId, legislature);
      return reply.send({
        data: buildDeputyProfile(deputy, stats, legislature),
      });
    },
  });

  fastify.route({
    method: "GET",
    url: "/deputies/:id/votes",
    schema: {
      tags: ["Députés"],
      params: z.object({ id: z.string() }),
      querystring: z.object({
        from: z.iso.date().optional(),
        to: z.iso.date().optional(),
        type: z.string().optional(),
        theme: ThemeSlugOptional,
        position: z
          .enum(["pour", "contre", "abstention", "nonVotant"])
          .optional(),
        legislature: z.string().default("17"),
        ...CursorPaginationQuery.shape,
      }),
      response: {
        200: z.object({
          data: DeputyVoteSchema.array(),
          meta: z.object({
            nextCursor: z.string().nullable(),
            hasMore: z.boolean(),
          }),
        }),
      },
    },
    handler: async (req, reply) => {
      const { id } = req.params;
      const { from, to, type, theme, position, legislature, limit, cursor } =
        req.query;
      const deputyId = await resolveDeputyId(service, id);
      const result = await service.getDeputyVotes(
        deputyId,
        legislature,
        { from, to, type, theme, position },
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
    url: "/deputies/:id/stats",
    schema: {
      tags: ["Députés"],
      params: z.object({ id: z.string() }),
      querystring: z.object({
        legislature: z.string().default("17"),
      }),
      response: {
        200: z.object({
          data: DeputyStatsSchema,
        }),
      },
    },
    handler: async (req, reply) => {
      const { id } = req.params;
      const { legislature } = req.query;
      const deputyId = await resolveDeputyId(service, id);
      const stats = await service.getDeputyStats(deputyId, legislature);
      return reply.send({ data: stats });
    },
  });
};

export default plugin;
