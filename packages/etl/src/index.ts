import "dotenv/config";
import { Pool } from "pg";
import { resolve } from "node:path";
import type { EtlConfig } from "./config.js";
import { defaultConfig, ensureTempDir } from "./config.js";
import { downloadZip } from "./downloader.js";
import {
  parseScrutinsFromZip,
  parseDeputiesFromZip,
  parseOrganesFromZip,
  parseAmendmentsFromZip,
  parseDossiersLegislatifsFromZip,
} from "./parser/index.js";
import {
  createLoader,
  loadDeputies,
  loadPoliticalGroups,
  loadMandates,
  loadAffiliations,
  loadScrutins,
  loadAmendments,
} from "./loader.js";
import { runClassification } from "./classifier.js";
import { runAmendmentMatching } from "./matcher.js";

export * from "./config.js";
export * from "./downloader.js";
export * from "./parser/index.js";
export * from "./loader.js";
export * from "./classifier.js";
export * from "./matcher.js";
export * from "./scheduler.js";

export interface PipelineResult {
  deputies: { inserted: number; updated: number };
  organes: { inserted: number; updated: number };
  mandates: { inserted: number; updated: number };
  affiliations: { inserted: number };
  scrutins: { inserted: number; updated: number; errors: number };
  amendments: { inserted: number; updated: number; errors: number };
  dossiersLegislatifs: { count: number };
  matching: { matched: number; skipped: number };
  classification: { processed: number; classified: number };
}

export async function runEtlPipeline(
  config: EtlConfig = defaultConfig,
): Promise<PipelineResult> {
  await ensureTempDir(config);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const pool = new Pool({ connectionString: databaseUrl });
  const deps = createLoader(pool);

  const result: PipelineResult = {
    deputies: { inserted: 0, updated: 0 },
    organes: { inserted: 0, updated: 0 },
    mandates: { inserted: 0, updated: 0 },
    affiliations: { inserted: 0 },
    scrutins: { inserted: 0, updated: 0, errors: 0 },
    amendments: { inserted: 0, updated: 0, errors: 0 },
    dossiersLegislatifs: { count: 0 },
    matching: { matched: 0, skipped: 0 },
    classification: { processed: 0, classified: 0 },
  };
  const extractLimits = {
    maxFiles: config.extractMaxFiles,
    maxTotalUncompressedBytes: config.extractMaxTotalUncompressedBytes,
  };

  try {
    console.log("[etl] Pipeline started");

    // ─── 1. Députés ──────────────────────────────────────────────
    console.log("[etl] Step 1/5: Deputies");
    const deputiesResult = await downloadZip(
      config.urls.deputies,
      resolve(config.tempDir, "deputies.zip"),
      config,
      config.checksums.deputies,
    );
    console.log(
      `[etl] Deputies zip: ${deputiesResult.skipped ? "skipped" : "downloaded"} (${deputiesResult.hash})`,
    );

    const deputiesIter = parseDeputiesFromZip(
      deputiesResult.filePath,
      config.tempDir,
      config.legislature,
      extractLimits,
    );
    result.deputies = await loadDeputies(deps, deputiesIter, config);
    console.log(
      `[etl] Deputies loaded: ${result.deputies.inserted} inserted, ${result.deputies.updated} updated`,
    );

    // Collect mandates & affiliations from the same file.
    // Organes (political groups) must be loaded BEFORE affiliations
    // because affiliations reference political_groups via FK.
    const deputiesIter2 = parseDeputiesFromZip(
      deputiesResult.filePath,
      config.tempDir,
      config.legislature,
      extractLimits,
    );
    const mandates: import("./parser/deputies.js").ParsedMandate[] = [];
    const affiliations: import("./parser/deputies.js").ParsedAffiliation[] = [];
    for await (const d of deputiesIter2) {
      mandates.push(...d.mandates);
      affiliations.push(...d.affiliations);
    }

    // ─── 2. Organes ──────────────────────────────────────────────
    console.log("[etl] Step 2/5: Organes");
    const organesResult = await downloadZip(
      config.urls.organes,
      resolve(config.tempDir, "organes.zip"),
      config,
      config.checksums.organes,
    );
    console.log(
      `[etl] Organes zip: ${organesResult.skipped ? "skipped" : "downloaded"} (${organesResult.hash})`,
    );

    const organesIter = parseOrganesFromZip(
      organesResult.filePath,
      config.tempDir,
      config.legislature,
      extractLimits,
    );
    result.organes = await loadPoliticalGroups(deps, organesIter, config);
    console.log(
      `[etl] Organes loaded: ${result.organes.inserted} inserted, ${result.organes.updated} updated`,
    );

    // Load mandates and affiliations (now that organes/groups exist)
    result.mandates = await loadMandates(
      deps,
      (async function* () {
        for (const m of mandates) yield m;
      })(),
    );
    console.log(
      `[etl] Mandates loaded: ${result.mandates.inserted} inserted, ${result.mandates.updated} updated`,
    );
    result.affiliations = await loadAffiliations(
      deps,
      (async function* () {
        for (const a of affiliations) yield a;
      })(),
    );
    console.log(
      `[etl] Affiliations loaded: ${result.affiliations.inserted} inserted`,
    );

    // ─── 3. Scrutins ─────────────────────────────────────────────
    console.log("[etl] Step 3/5: Scrutins");
    const scrutinsResult = await downloadZip(
      config.urls.scrutins,
      resolve(config.tempDir, "scrutins.zip"),
      config,
      config.checksums.scrutins,
    );
    console.log(
      `[etl] Scrutins zip: ${scrutinsResult.skipped ? "skipped" : "downloaded"} (${scrutinsResult.hash})`,
    );

    const scrutinsIter = parseScrutinsFromZip(
      scrutinsResult.filePath,
      config.tempDir,
      extractLimits,
    );
    result.scrutins = await loadScrutins(deps, scrutinsIter, config, (p) => {
      if (p % 500 === 0) console.log(`[etl] Scrutins processed: ${p}`);
    });
    console.log(
      `[etl] Scrutins loaded: ${result.scrutins.inserted} inserted, ${result.scrutins.updated} updated, ${result.scrutins.errors} errors`,
    );

    // ─── 4. Classification ───────────────────────────────────────
    console.log("[etl] Step 4/5: Classification");
    result.classification = await runClassification(deps.db);
    console.log(
      `[etl] Classification: ${result.classification.processed} processed, ${result.classification.classified} classified`,
    );

    // ─── 5. Dossiers législatifs ───────────────────────────────
    console.log("[etl] Step 5/6: Dossiers législatifs");
    const dossiersResult = await downloadZip(
      config.urls.dossiersLegislatifs,
      resolve(config.tempDir, "dossiers_legislatifs.zip"),
      config,
      config.checksums.dossiersLegislatifs,
    );
    console.log(
      `[etl] Dossiers législatifs zip: ${dossiersResult.skipped ? "skipped" : "downloaded"} (${dossiersResult.hash})`,
    );

    const dossiersIter = parseDossiersLegislatifsFromZip(
      dossiersResult.filePath,
      config.tempDir,
      extractLimits,
    );
    const dossiers: import("./parser/dossiers.js").ParsedDossierLegislatif[] = [];
    for await (const d of dossiersIter) {
      dossiers.push(d);
    }
    result.dossiersLegislatifs.count = dossiers.length;
    console.log(`[etl] Dossiers législatifs loaded: ${dossiers.length}`);

    // ─── 6. Amendements + Matching ──────────────────────────────
    console.log("[etl] Step 6/6: Amendments + matching");
    const amendmentsResult = await downloadZip(
      config.urls.amendments,
      resolve(config.tempDir, "amendments.zip"),
      config,
      config.checksums.amendments,
    );
    console.log(
      `[etl] Amendments zip: ${amendmentsResult.skipped ? "skipped" : "downloaded"} (${amendmentsResult.hash})`,
    );

    const amendmentsIter = parseAmendmentsFromZip(
      amendmentsResult.filePath,
      config.tempDir,
      extractLimits,
    );
    result.amendments = await loadAmendments(
      deps,
      amendmentsIter,
      config,
      (p) => {
        if (p % 1000 === 0) console.log(`[etl] Amendments processed: ${p}`);
      },
    );
    console.log(
      `[etl] Amendments loaded: ${result.amendments.inserted} inserted, ${result.amendments.updated} updated, ${result.amendments.errors} errors`,
    );

    // Matching
    if (result.amendments.inserted > 0 || result.scrutins.inserted > 0) {
      const matchResult = await runAmendmentMatching(deps, dossiers);
      result.matching = {
        matched: matchResult.matched,
        skipped: matchResult.skipped,
      };
      console.log(
        `[etl] Matching: ${result.matching.matched} matched, ${result.matching.skipped} skipped`,
      );
    } else {
      console.log("[etl] Skipping matching (no new data)");
    }

    console.log("[etl] Pipeline completed successfully");
  } catch (err) {
    console.error(
      "[etl] Pipeline failed:",
      err instanceof Error ? err.message : String(err),
    );
    throw err;
  } finally {
    await deps.pool.end();
  }

  return result;
}
