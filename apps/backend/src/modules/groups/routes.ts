import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { eq, and, sql, count } from "drizzle-orm";
import { getDb } from "../../db/client.js";
import {
  politicalGroups,
  scrutinVotes,
  scrutins,
  scrutinGroupVotes,
  deputyGroupAffiliations,
} from "../../db/schema.js";
import { NotFoundError } from "../common/errors.js";
import { NullableDateString } from "../common/schemas.js";

const GroupSchema = z.object({
  id: z.string(),
  legislature: z.string(),
  name: z.string(),
  abbreviation: z.string().nullable(),
  startDate: NullableDateString,
  endDate: NullableDateString,
});

const GroupStatsSchema = z.object({
  groupId: z.string(),
  name: z.string(),
  abbreviation: z.string().nullable(),
  totalMembers: z.number(),
  totalScrutins: z.number(),
  avgParticipationRate: z.number(),
  avgLoyaltyRate: z.number(),
  voteDistribution: z.object({
    pour: z.number(),
    contre: z.number(),
    abstention: z.number(),
    nonVotant: z.number(),
  }),
});

const plugin: FastifyPluginAsyncZod = async function (fastify) {
  const db = getDb();

  fastify.route({
    method: "GET",
    url: "/groups",
    schema: {
      tags: ["Groupes"],
      querystring: z.object({
        legislature: z.string().default("17"),
      }),
      response: {
        200: z.object({
          data: GroupSchema.array(),
        }),
      },
    },
    handler: async (_req, reply) => {
      const { legislature } = _req.query;
      const rows = await db
        .select()
        .from(politicalGroups)
        .where(eq(politicalGroups.legislature, legislature))
        .orderBy(politicalGroups.name);

      return reply.send({
        data: rows,
      });
    },
  });

  fastify.route({
    method: "GET",
    url: "/groups/:id/stats",
    schema: {
      tags: ["Groupes"],
      params: z.object({ id: z.string() }),
      querystring: z.object({
        legislature: z.string().default("17"),
      }),
      response: {
        200: z.object({
          data: GroupStatsSchema,
        }),
      },
    },
    handler: async (req, reply) => {
      const { id } = req.params;
      const { legislature } = req.query;

      const groupResult = await db
        .select()
        .from(politicalGroups)
        .where(eq(politicalGroups.id, id))
        .limit(1);

      const group = groupResult[0];
      if (!group) {
        throw new NotFoundError("Group", id);
      }

      const totalScrutinsResult = await db
        .select({ total: count() })
        .from(scrutins)
        .where(eq(scrutins.legislature, legislature));
      const totalScrutins = totalScrutinsResult[0]?.total ?? 0;

      const membersResult = await db
        .select({ total: count() })
        .from(deputyGroupAffiliations)
        .where(
          and(
            eq(deputyGroupAffiliations.politicalGroupId, id),
            sql`${deputyGroupAffiliations.endDate} IS NULL`,
          ),
        );
      const totalMembers = membersResult[0]?.total ?? 0;

      // Group vote distribution
      const distributionResult = await db
        .select({
          position: scrutinGroupVotes.positionMajoritaire,
          count: count(),
        })
        .from(scrutinGroupVotes)
        .innerJoin(scrutins, eq(scrutinGroupVotes.scrutinId, scrutins.id))
        .where(
          and(
            eq(scrutinGroupVotes.politicalGroupId, id),
            eq(scrutins.legislature, legislature),
          ),
        )
        .groupBy(scrutinGroupVotes.positionMajoritaire);

      const voteDistribution = {
        pour: 0,
        contre: 0,
        abstention: 0,
        nonVotant: 0,
      };
      for (const row of distributionResult) {
        const pos = row.position as keyof typeof voteDistribution | null;
        if (pos && pos in voteDistribution) {
          voteDistribution[pos] = row.count;
        }
      }

      // Average participation rate across group members
      const participationResult = await db.execute(sql`
        WITH member_stats AS (
          SELECT
            sv.deputy_id,
            COUNT(*)::float / NULLIF(${totalScrutins}, 0) AS participation_rate
          FROM ${scrutinVotes} sv
          INNER JOIN ${scrutins} s ON sv.scrutin_id = s.id
          WHERE sv.political_group_id = ${id}
            AND s.legislature = ${legislature}
            AND sv.position != 'nonVotant'
          GROUP BY sv.deputy_id
        )
        SELECT COALESCE(AVG(participation_rate), 0) AS avg_participation
        FROM member_stats
      `);
      const avgParticipationRate = Number(
        participationResult.rows[0]?.["avg_participation"] ?? 0,
      );

      // Average loyalty rate across group members
      const loyaltyResult = await db.execute(sql`
        WITH member_loyalty AS (
          SELECT
            sv.deputy_id,
            COUNT(*) FILTER (WHERE sv.position = sgp.position_majoritaire)::float
              / NULLIF(COUNT(*) FILTER (WHERE sv.position != 'nonVotant'), 0) AS loyalty_rate
          FROM ${scrutinVotes} sv
          INNER JOIN ${scrutins} s ON sv.scrutin_id = s.id
          INNER JOIN ${scrutinGroupVotes} sgp
            ON sv.scrutin_id = sgp.scrutin_id AND sv.political_group_id = sgp.political_group_id
          WHERE sv.political_group_id = ${id}
            AND s.legislature = ${legislature}
            AND sgp.position_majoritaire IS NOT NULL
          GROUP BY sv.deputy_id
        )
        SELECT COALESCE(AVG(loyalty_rate), 0) AS avg_loyalty
        FROM member_loyalty
      `);
      const avgLoyaltyRate = Number(
        loyaltyResult.rows[0]?.["avg_loyalty"] ?? 0,
      );

      return reply.send({
        data: {
          groupId: group.id,
          name: group.name,
          abbreviation: group.abbreviation,
          totalMembers,
          totalScrutins,
          avgParticipationRate: Number(avgParticipationRate.toFixed(4)),
          avgLoyaltyRate: Number(avgLoyaltyRate.toFixed(4)),
          voteDistribution,
        },
      });
    },
  });
};

export default plugin;
