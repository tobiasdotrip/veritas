import cron from "node-cron";
import { runEtlPipeline } from "./index.js";
import type { EtlConfig } from "./config.js";

export interface SchedulerHandle {
  stop(): Promise<void>;
}

let runningJob: Promise<void> | null = null;

export function startScheduler(config: EtlConfig): SchedulerHandle {
  const task = cron.schedule(
    "0 6 * * *",
    () => {
      if (runningJob) {
        console.warn(
          "[scheduler] Previous ETL job still running, skipping tick",
        );
        return;
      }

      runningJob = (async () => {
        console.log("[scheduler] Starting daily ETL job at 06:00 Europe/Paris");
        try {
          await runEtlPipeline(config);
          console.log("[scheduler] Daily ETL job completed successfully");
        } catch (err) {
          console.error(
            "[scheduler] Daily ETL job failed:",
            err instanceof Error ? err.message : String(err),
          );
        } finally {
          runningJob = null;
        }
      })();
    },
    {
      timezone: "Europe/Paris",
      scheduled: true,
    },
  );

  console.log("[scheduler] Scheduled daily ETL at 06:00 Europe/Paris");

  return {
    async stop() {
      task.stop();
      if (runningJob) {
        console.log("[scheduler] Waiting for in-flight ETL job to finish...");
        await runningJob;
      }
      console.log("[scheduler] Stopped");
    },
  };
}
