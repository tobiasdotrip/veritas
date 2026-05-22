import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import * as schema from "../db/schema.js";
import { getRedis } from "../modules/common/cache.js";

export const FIXTURE = {
  legislatureId: "17",
  theme: { slug: "sante", label: "Santé" },
  group: {
    id: "PO_TEST001",
    name: "Renaissance",
    abbreviation: "RE",
  },
  deputies: {
    dupont: {
      id: "PA_TEST001",
      firstName: "Jean",
      lastName: "Dupont",
      slug: "jean-dupont",
      departmentId: "075",
      circoNumber: 1,
      circoLabel: "Paris 1",
    },
    martin: {
      id: "PA_TEST002",
      firstName: "Marie",
      lastName: "Martin",
      slug: "marie-martin",
      departmentId: "069",
      circoNumber: 2,
      circoLabel: "Rhône 2",
    },
  },
  mandates: {
    dupont: { id: "PM_TEST001" },
    martin: { id: "PM_TEST002" },
  },
  scrutins: {
    sante: {
      id: "VT_TEST001",
      numero: 100,
      titre: "Projet de loi santé publique et hôpitaux",
      sortCode: "adopté" as const,
      codeTypeVote: "solennel",
    },
    budget: {
      id: "VT_TEST002",
      numero: 99,
      titre: "Projet de loi de finances pour 2025",
      sortCode: "rejeté" as const,
      codeTypeVote: "budget",
    },
    motion: {
      id: "VT_TEST003",
      numero: 98,
      titre: "Motion de censure sur la politique gouvernementale",
      sortCode: "rejeté" as const,
      codeTypeVote: "motion_censure",
    },
  },
} as const;

const mandateStart = new Date("2024-07-18");
const dates = {
  sante: new Date("2024-10-15"),
  budget: new Date("2024-09-01"),
  motion: new Date("2024-08-01"),
};

export async function resetTestFixtures(pool: Pool): Promise<void> {
  const db = drizzle(pool, { schema });

  await db.execute(sql`
    TRUNCATE TABLE
      scrutin_votes,
      scrutin_group_votes,
      scrutin_themes,
      scrutins,
      deputy_group_affiliations,
      deputy_mandates,
      deputies,
      political_groups,
      themes,
      communes,
      sync_logs
    RESTART IDENTITY CASCADE
  `);

  await seedTestFixtures(pool);

  try {
    const redis = await getRedis();
    await redis.flushDb();
  } catch {
    // Redis may be unavailable for repository-only tests
  }
}

export async function seedTestFixtures(pool: Pool): Promise<void> {
  const db = drizzle(pool, { schema });
  const { legislatureId, theme, group, deputies, mandates, scrutins } =
    FIXTURE;

  await db
    .insert(schema.legislatures)
    .values({
      id: legislatureId,
      startDate: mandateStart,
      isCurrent: true,
    })
    .onConflictDoNothing();

  const [insertedTheme] = await db
    .insert(schema.themes)
    .values({
      slug: theme.slug,
      label: theme.label,
      description: "Système de santé et hôpitaux",
    })
    .onConflictDoNothing()
    .returning({ id: schema.themes.id });

  let themeId = insertedTheme?.id;
  if (!themeId) {
    const existing = await db
      .select({ id: schema.themes.id })
      .from(schema.themes)
      .where(eq(schema.themes.slug, theme.slug))
      .limit(1);
    themeId = existing[0]!.id;
  }

  await db.insert(schema.politicalGroups).values({
    id: group.id,
    legislature: legislatureId,
    name: group.name,
    abbreviation: group.abbreviation,
    startDate: mandateStart,
  });

  await db.insert(schema.deputies).values([
    {
      id: deputies.dupont.id,
      firstName: deputies.dupont.firstName,
      lastName: deputies.dupont.lastName,
      slug: deputies.dupont.slug,
      departmentId: deputies.dupont.departmentId,
      circoNumber: deputies.dupont.circoNumber,
      circoLabel: deputies.dupont.circoLabel,
    },
    {
      id: deputies.martin.id,
      firstName: deputies.martin.firstName,
      lastName: deputies.martin.lastName,
      slug: deputies.martin.slug,
      departmentId: deputies.martin.departmentId,
      circoNumber: deputies.martin.circoNumber,
      circoLabel: deputies.martin.circoLabel,
    },
  ]);

  await db.insert(schema.deputyMandates).values([
    {
      id: mandates.dupont.id,
      deputyId: deputies.dupont.id,
      legislature: legislatureId,
      startDate: mandateStart,
      departmentId: deputies.dupont.departmentId,
      circoNumber: deputies.dupont.circoNumber,
      circoLabel: deputies.dupont.circoLabel,
    },
    {
      id: mandates.martin.id,
      deputyId: deputies.martin.id,
      legislature: legislatureId,
      startDate: mandateStart,
      departmentId: deputies.martin.departmentId,
      circoNumber: deputies.martin.circoNumber,
      circoLabel: deputies.martin.circoLabel,
    },
  ]);

  await db.insert(schema.deputyGroupAffiliations).values([
    {
      deputyId: deputies.dupont.id,
      politicalGroupId: group.id,
      mandateId: mandates.dupont.id,
      startDate: mandateStart,
    },
    {
      deputyId: deputies.martin.id,
      politicalGroupId: group.id,
      mandateId: mandates.martin.id,
      startDate: mandateStart,
    },
  ]);

  await db.insert(schema.scrutins).values([
    {
      id: scrutins.sante.id,
      legislature: legislatureId,
      numero: scrutins.sante.numero,
      dateScrutin: dates.sante,
      titre: scrutins.sante.titre,
      sortCode: scrutins.sante.sortCode,
      codeTypeVote: scrutins.sante.codeTypeVote,
      nombrePour: 280,
      nombreContre: 120,
      nombreAbstentions: 30,
    },
    {
      id: scrutins.budget.id,
      legislature: legislatureId,
      numero: scrutins.budget.numero,
      dateScrutin: dates.budget,
      titre: scrutins.budget.titre,
      sortCode: scrutins.budget.sortCode,
      codeTypeVote: scrutins.budget.codeTypeVote,
      nombrePour: 200,
      nombreContre: 250,
      nombreAbstentions: 15,
    },
    {
      id: scrutins.motion.id,
      legislature: legislatureId,
      numero: scrutins.motion.numero,
      dateScrutin: dates.motion,
      titre: scrutins.motion.titre,
      sortCode: scrutins.motion.sortCode,
      codeTypeVote: scrutins.motion.codeTypeVote,
      nombrePour: 100,
      nombreContre: 350,
      nombreAbstentions: 20,
    },
  ]);

  await db.insert(schema.scrutinThemes).values({
    scrutinId: scrutins.sante.id,
    themeId,
    confidence: "0.95",
  });

  for (const scrutinId of [
    scrutins.sante.id,
    scrutins.budget.id,
    scrutins.motion.id,
  ]) {
    await db.insert(schema.scrutinGroupVotes).values({
      scrutinId,
      politicalGroupId: group.id,
      nombreMembresGroupe: 90,
      positionMajoritaire: "pour",
      nombrePour: 80,
      nombreContre: 5,
      nombreAbstentions: 5,
    });
  }

  await db.insert(schema.scrutinVotes).values([
    {
      scrutinId: scrutins.sante.id,
      deputyId: deputies.dupont.id,
      mandateId: mandates.dupont.id,
      politicalGroupId: group.id,
      position: "pour",
    },
    {
      scrutinId: scrutins.sante.id,
      deputyId: deputies.martin.id,
      mandateId: mandates.martin.id,
      politicalGroupId: group.id,
      position: "pour",
    },
    {
      scrutinId: scrutins.budget.id,
      deputyId: deputies.dupont.id,
      mandateId: mandates.dupont.id,
      politicalGroupId: group.id,
      position: "pour",
    },
    {
      scrutinId: scrutins.budget.id,
      deputyId: deputies.martin.id,
      mandateId: mandates.martin.id,
      politicalGroupId: group.id,
      position: "contre",
    },
    {
      scrutinId: scrutins.motion.id,
      deputyId: deputies.dupont.id,
      mandateId: mandates.dupont.id,
      politicalGroupId: group.id,
      position: "contre",
    },
    {
      scrutinId: scrutins.motion.id,
      deputyId: deputies.martin.id,
      mandateId: mandates.martin.id,
      politicalGroupId: group.id,
      position: "nonVotant",
    },
  ]);
}
