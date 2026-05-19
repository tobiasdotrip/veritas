import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export interface EtlConfig {
  urls: {
    scrutins: string;
    deputies: string;
    organes: string;
  };
  tempDir: string;
  downloadTimeoutMs: number;
  downloadRetries: number;
  batchSize: number;
  scrutinTransactionSize: number;
  legislature: string;
}

export const defaultConfig: EtlConfig = {
  urls: {
    scrutins:
      "https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip",
    deputies:
      "https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs/AMO10_deputes_actifs.json.zip",
    organes:
      "https://data.assemblee-nationale.fr/static/openData/repository/17/amo/organe/AMO20_organe.json.zip",
  },
  tempDir: resolve(process.env.TEMP_DIR ?? "./tmp/etl"),
  downloadTimeoutMs: Number(process.env.DOWNLOAD_TIMEOUT_MS ?? 120_000),
  downloadRetries: Number(process.env.DOWNLOAD_RETRIES ?? 3),
  batchSize: Number(process.env.BATCH_SIZE ?? 1_000),
  scrutinTransactionSize: Number(process.env.SCRUTIN_TX_SIZE ?? 100),
  legislature: process.env.LEGISLATURE ?? "17",
};

export async function ensureTempDir(config: EtlConfig): Promise<void> {
  await mkdir(config.tempDir, { recursive: true });
}
