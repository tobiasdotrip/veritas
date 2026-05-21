import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@veritas/shared";

export interface ThemeRule {
  slug: string;
  label: string;
  patterns: RegExp[];
}

const themeRules: ThemeRule[] = [
  {
    slug: "sante",
    label: "Santé",
    patterns: [
      /sant[ée]/i,
      /h[ôo]pital/i,
      /m[ée]dic/i,
      /soins?/i,
      /maladie/i,
      /vaccin/i,
      /s[ée]curit[ée].+sanitaire/i,
    ],
  },
  {
    slug: "education",
    label: "Éducation",
    patterns: [
      /[ée]ducation/i,
      /enseignement/i,
      /[ée]cole/i,
      /universit[ée]/i,
      /[ée]tudiant/i,
      /recherche/i,
    ],
  },
  {
    slug: "economie",
    label: "Économie",
    patterns: [
      /[ée]conomie/i,
      /finances?/i,
      /budget/i,
      /imp[ôo]t/i,
      /fiscal/i,
      /entreprise/i,
      /commerce/i,
      /prix/i,
      /inflation/i,
    ],
  },
  {
    slug: "environnement",
    label: "Environnement",
    patterns: [
      /environnement/i,
      /climat/i,
      /[ée]nergie/i,
      /nucl[ée]aire/i,
      /pollution/i,
      /biodiversit[ée]/i,
      /d[ée]chet/i,
      /transition/i,
    ],
  },
  {
    slug: "travail",
    label: "Travail",
    patterns: [
      /travail/i,
      /emploi/i,
      /ch[ôo]mage/i,
      /retraite/i,
      /salaire/i,
      /smic/i,
      /formation/i,
      /professionnel/i,
    ],
  },
  {
    slug: "securite",
    label: "Sécurité",
    patterns: [
      /s[ée]curit[ée]/i,
      /police/i,
      /arm[ée]e/i,
      /d[ée]fense/i,
      /terrorisme/i,
      /justice/i,
      /p[ée]nitentiaire/i,
    ],
  },
  {
    slug: "institutions",
    label: "Institutions",
    patterns: [
      /institution/i,
      /constitution/i,
      /r[ée]f[ée]rendum/i,
      /parlement/i,
      /assembl[ée]e/i,
      /s[ée]nat/i,
      /[ée]lection/i,
      /r[ée]glement/i,
    ],
  },
  {
    slug: "culture",
    label: "Culture",
    patterns: [
      /culture/i,
      /patrimoine/i,
      /m[ée]dia/i,
      /communication/i,
      /sport/i,
      /tourisme/i,
    ],
  },
];

export function classifyText(text: string): string[] {
  const themes: string[] = [];
  for (const rule of themeRules) {
    if (rule.patterns.some((p) => p.test(text))) {
      themes.push(rule.slug);
    }
  }
  return themes;
}

export async function runClassification(
  db: NodePgDatabase<typeof schema>,
  limit?: number
): Promise<{ processed: number; classified: number }> {
  let processed = 0;
  let classified = 0;

  const batchSize = limit ?? 10_000;

  const scrutinsToClassify = await db
    .select({
      id: schema.scrutins.id,
      titre: schema.scrutins.titre,
      objet: schema.scrutins.objet,
    })
    .from(schema.scrutins)
    .where(
      sql`NOT EXISTS (
        SELECT 1 FROM ${schema.scrutinThemes}
        WHERE ${schema.scrutinThemes.scrutinId} = ${schema.scrutins.id}
      )`
    )
    .limit(batchSize);

  for (const s of scrutinsToClassify) {
    const text = `${s.titre ?? ""} ${s.objet ?? ""}`;
    const slugs = classifyText(text);
    processed++;

    if (slugs.length === 0) continue;
    classified++;

    for (const slug of slugs) {
      const existing = await db
        .select()
        .from(schema.themes)
        .where(eq(schema.themes.slug, slug))
        .limit(1);

      let themeId: number;
      if (existing.length === 0) {
        const inserted = await db
          .insert(schema.themes)
          .values({
            slug,
            label: themeRules.find((r) => r.slug === slug)?.label ?? slug,
            description: null,
          })
          .returning({ id: schema.themes.id });
        if (!inserted[0]) throw new Error(`Theme insert failed for ${slug}`);
        themeId = inserted[0].id;
      } else {
        if (!existing[0]) throw new Error(`Theme lookup failed for ${slug}`);
        themeId = existing[0].id;
      }

      await db
        .insert(schema.scrutinThemes)
        .values({
          scrutinId: s.id,
          themeId,
          confidence: "0.80",
          createdAt: new Date(),
        })
        .onConflictDoNothing({
          target: [
            schema.scrutinThemes.scrutinId,
            schema.scrutinThemes.themeId,
          ],
        });
    }
  }

  return { processed, classified };
}
