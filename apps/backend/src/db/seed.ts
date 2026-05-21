import { sql } from "drizzle-orm";
import { getDb, closeDb } from "./client.js";
import { legislatures, themes, communes } from "./schema.js";

async function main() {
  const db = getDb();

  console.log("🔧 Creating PostgreSQL extensions...");
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "unaccent"`);

  console.log("🌱 Seeding legislature 17...");
  await db
    .insert(legislatures)
    .values({
      id: "17",
      startDate: new Date("2024-07-18"),
      isCurrent: true,
    })
    .onConflictDoNothing();

  console.log("🌱 Seeding themes...");
  const themeData = [
    {
      slug: "sante",
      label: "Santé",
      description: "Système de santé, hôpitaux, sécurité sanitaire",
    },
    {
      slug: "education",
      label: "Éducation",
      description: "École, université, recherche, formation",
    },
    {
      slug: "economie",
      label: "Économie",
      description: "Croissance, finances publiques, commerce",
    },
    {
      slug: "environnement",
      label: "Environnement",
      description: "Climat, énergie, biodiversité",
    },
    {
      slug: "travail",
      label: "Travail",
      description: "Emploi, droit du travail, retraite",
    },
    {
      slug: "securite",
      label: "Sécurité",
      description: "Défense, police, justice, terrorisme",
    },
    {
      slug: "institutions",
      label: "Institutions",
      description: "Constitution, réformes institutionnelles",
    },
    {
      slug: "culture",
      label: "Culture",
      description: "Patrimoine, médias, création artistique",
    },
  ];

  for (const t of themeData) {
    await db.insert(themes).values(t).onConflictDoNothing();
  }

  console.log("🌱 Seeding communes (10 largest cities)...");
  const communeData = [
    {
      id: "75056",
      name: "Paris",
      postalCode: "75000",
      departmentId: "075",
      circoNumber: 1,
    },
    {
      id: "13055",
      name: "Marseille",
      postalCode: "13000",
      departmentId: "013",
      circoNumber: 1,
    },
    {
      id: "69123",
      name: "Lyon",
      postalCode: "69000",
      departmentId: "069",
      circoNumber: 1,
    },
    {
      id: "31555",
      name: "Toulouse",
      postalCode: "31000",
      departmentId: "031",
      circoNumber: 1,
    },
    {
      id: "06088",
      name: "Nice",
      postalCode: "06000",
      departmentId: "006",
      circoNumber: 1,
    },
    {
      id: "44109",
      name: "Nantes",
      postalCode: "44000",
      departmentId: "044",
      circoNumber: 1,
    },
    {
      id: "67482",
      name: "Strasbourg",
      postalCode: "67000",
      departmentId: "067",
      circoNumber: 1,
    },
    {
      id: "33063",
      name: "Bordeaux",
      postalCode: "33000",
      departmentId: "033",
      circoNumber: 1,
    },
    {
      id: "34172",
      name: "Montpellier",
      postalCode: "34000",
      departmentId: "034",
      circoNumber: 1,
    },
    {
      id: "59350",
      name: "Lille",
      postalCode: "59000",
      departmentId: "059",
      circoNumber: 1,
    },
  ];

  for (const c of communeData) {
    await db.insert(communes).values(c).onConflictDoNothing();
  }

  console.log("✅ Seed completed");
  await closeDb();
}

main().catch((err) => {
  console.error("❌ Seed failed", err);
  process.exit(1);
});
