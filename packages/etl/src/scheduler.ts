import cron from "node-cron";
import { runEtlPipeline } from "./index.js";
import type { EtlConfig } from "./config.js";

export function startScheduler(config: EtlConfig): cron.ScheduledTask {
  const task = cron.schedule(
    "0 6 * * *",
    async () => {
      console.log("[scheduler] Starting daily ETL job at 06:00 Europe/Paris");
      try {
        await runEtlPipeline(config);
        console.log("[scheduler] Daily ETL job completed successfully");
      } catch (err) {
        console.error(
          "[scheduler] Daily ETL job failed:",
          err instanceof Error ? err.message : String(err)
        );
      }
    },
    {
      timezone: "Europe/Paris",
      scheduled: true,
    }
  );

  console.log("[scheduler] Scheduled daily ETL at 06:00 Europe/Paris");
  return task;
}
