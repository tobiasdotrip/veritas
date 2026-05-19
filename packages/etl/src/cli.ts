#!/usr/bin/env node
import "dotenv/config";
import { runEtlPipeline } from "./index.js";

async function main() {
  try {
    await runEtlPipeline();
    process.exit(0);
  } catch (err) {
    console.error("ETL failed:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
