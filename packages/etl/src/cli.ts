#!/usr/bin/env node
import "dotenv/config";
import { runEtlPipeline, startScheduler, defaultConfig } from "./index.js";

function registerGracefulShutdown(shutdown: () => Promise<void>): void {
  let shuttingDown = false;

  const handleSignal = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[etl] ${signal} received, shutting down...`);
    shutdown()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(
          "[etl] Shutdown failed:",
          err instanceof Error ? err.message : String(err)
        );
        process.exit(1);
      });
  };

  process.on("SIGTERM", () => handleSignal("SIGTERM"));
  process.on("SIGINT", () => handleSignal("SIGINT"));
}

async function main() {
  const scheduleMode = process.argv.includes("--schedule");

  if (scheduleMode) {
    const scheduler = startScheduler(defaultConfig);
    registerGracefulShutdown(() => scheduler.stop());
    return;
  }

  try {
    await runEtlPipeline();
    process.exit(0);
  } catch (err) {
    console.error("ETL failed:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
