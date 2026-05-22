import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client.js";
import { deputies } from "../../db/schema.js";
import { createDeputyRepository } from "../deputies/repository.js";
import { createScrutinRepository } from "../scrutins/repository.js";
import { NotFoundError } from "../common/errors.js";
import { OgCompareQuery, OgDeputeQuery, OgScrutinQuery } from "./schemas.js";
import { renderOgSvg, OG_CACHE_HEADERS } from "./render.js";
import {
  CompareOgTemplate,
  DeputyOgTemplate,
  ScrutinOgTemplate,
} from "./templates.js";

const plugin: FastifyPluginAsyncZod = async function (fastify) {
  const db = getDb();
  const deputyRepo = createDeputyRepository(db);
  const scrutinRepo = createScrutinRepository(db);

  async function resolveDeputy(slugOrId: string) {
    if (slugOrId.startsWith("PA")) {
      const row = await db
        .select()
        .from(deputies)
        .where(eq(deputies.id, slugOrId))
        .limit(1);
      return row[0] ?? null;
    }
    return deputyRepo.getBySlug(slugOrId);
  }

  fastify.route({
    method: "GET",
    url: "/og/depute",
    schema: {
      tags: ["Open Graph"],
      querystring: OgDeputeQuery,
      response: {
        200: z.string(),
      },
    },
    handler: async (req, reply) => {
      const { slug, legislature } = req.query;
      const deputy = await resolveDeputy(slug);
      if (!deputy) {
        throw new NotFoundError("Deputy", slug);
      }

      const details = await deputyRepo.getWithDetails(deputy.id);
      const stats = await deputyRepo.getStats(deputy.id, legislature);

      const svg = await renderOgSvg(
        DeputyOgTemplate({
          firstName: deputy.firstName,
          lastName: deputy.lastName,
          groupAbbreviation: details?.currentGroup?.abbreviation ?? null,
          participationRate: stats.participationRate,
          loyaltyRate: stats.loyaltyRate,
          votesCast: stats.votesCast,
        }),
      );

      return reply.headers(OG_CACHE_HEADERS).send(svg);
    },
  });

  fastify.route({
    method: "GET",
    url: "/og/scrutin",
    schema: {
      tags: ["Open Graph"],
      querystring: OgScrutinQuery,
      response: {
        200: z.string(),
      },
    },
    handler: async (req, reply) => {
      const { id } = req.query;
      const scrutin = await scrutinRepo.getById(id);
      if (!scrutin) {
        throw new NotFoundError("Scrutin", id);
      }

      const svg = await renderOgSvg(
        ScrutinOgTemplate({
          numero: scrutin.numero,
          titre: scrutin.titre,
          sortCode: scrutin.sortCode,
          nombrePour: scrutin.nombrePour,
          nombreContre: scrutin.nombreContre,
          nombreAbstentions: scrutin.nombreAbstentions,
        }),
      );

      return reply.headers(OG_CACHE_HEADERS).send(svg);
    },
  });

  fastify.route({
    method: "GET",
    url: "/og/comparateur",
    schema: {
      tags: ["Open Graph"],
      querystring: OgCompareQuery,
      response: {
        200: z.string(),
      },
    },
    handler: async (req, reply) => {
      const { score } = req.query;
      const svg = await renderOgSvg(CompareOgTemplate({ score }));

      return reply.headers(OG_CACHE_HEADERS).send(svg);
    },
  });
};

export default plugin;
