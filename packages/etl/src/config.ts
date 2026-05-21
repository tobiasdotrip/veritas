import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const ALLOWED_ETL_HOST = "data.assemblee-nationale.fr";

const DEFAULT_URLS = {
  scrutins:
    "https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip",
  deputies:
    "https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs/AMO10_deputes_actifs.json.zip",
  organes:
    "https://data.assemblee-nationale.fr/static/openData/repository/17/amo/organe/AMO20_organe.json.zip",
} as const;

export function validateEtlUrl(url: string, label: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid ${label} URL: ${url}`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`${label} URL must use HTTPS`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${label} URL must not contain credentials`);
  }
  if (parsed.hostname !== ALLOWED_ETL_HOST) {
    throw new Error(`${label} URL host must be ${ALLOWED_ETL_HOST}`);
  }
  if (process.env.NODE_ENV !== "development" && parsed.port && parsed.port !== "443") {
    throw new Error(`${label} URL must use standard HTTPS port`);
  }
  return url;
}

export interface EtlConfig {
  urls: {
    scrutins: string;
    deputies: string;
    organes: string;
  };
  tempDir: string;
  downloadTimeoutMs: number;
  downloadRetries: number;
  downloadMaxSizeBytes: number;
  batchSize: number;
  scrutinTransactionSize: number;
  legislature: string;
}

export const defaultConfig: EtlConfig = {
  urls: {
    scrutins: validateEtlUrl(
      process.env.ETL_URL_SCRUTINS ?? DEFAULT_URLS.scrutins,
      "scrutins"
    ),
    deputies: validateEtlUrl(
      process.env.ETL_URL_DEPUTIES ?? DEFAULT_URLS.deputies,
      "deputies"
    ),
    organes: validateEtlUrl(
      process.env.ETL_URL_ORGANES ?? DEFAULT_URLS.organes,
      "organes"
    ),
  },
  tempDir: resolve(process.env.TEMP_DIR ?? "./tmp/etl"),
  downloadTimeoutMs: Number(process.env.DOWNLOAD_TIMEOUT_MS ?? 120_000),
  downloadRetries: Number(process.env.DOWNLOAD_RETRIES ?? 3),
  downloadMaxSizeBytes: Number(process.env.DOWNLOAD_MAX_SIZE_BYTES ?? 500 * 1024 * 1024),
  batchSize: Number(process.env.BATCH_SIZE ?? 1_000),
  scrutinTransactionSize: Number(process.env.SCRUTIN_TX_SIZE ?? 100),
  legislature: process.env.LEGISLATURE ?? "17",
};

export async function ensureTempDir(config: EtlConfig): Promise<void> {
  await mkdir(config.tempDir, { recursive: true });
}
