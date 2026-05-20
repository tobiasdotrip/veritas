import { createWriteStream } from "node:fs";
import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import fetch from "node-fetch";
import type { EtlConfig } from "./config.js";

export interface DownloadState {
  url: string;
  etag?: string | undefined;
  lastModified?: string | undefined;
  hash?: string | undefined;
  downloadedAt?: string | undefined;
}

export interface DownloadResult {
  filePath: string;
  hash: string;
  size: number;
  skipped: boolean;
}

function getStatePath(config: EtlConfig, url: string): string {
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 16);
  return resolve(config.tempDir, `download-state-${hash}.json`);
}

async function readState(
  config: EtlConfig,
  url: string
): Promise<DownloadState | undefined> {
  try {
    const raw = await readFile(getStatePath(config, url), "utf-8");
    return JSON.parse(raw) as DownloadState;
  } catch {
    return undefined;
  }
}

async function writeState(
  config: EtlConfig,
  state: DownloadState
): Promise<void> {
  await writeFile(
    getStatePath(config, state.url),
    JSON.stringify(state, null, 2)
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function downloadZip(
  url: string,
  outputPath: string,
  config: EtlConfig
): Promise<DownloadResult> {
  const state = await readState(config, url);

  const headController = new AbortController();
  const headTimeout = setTimeout(() => headController.abort(), config.downloadTimeoutMs);
  const headResponse = await fetch(url, {
    method: "HEAD",
    signal: headController.signal,
  });
  clearTimeout(headTimeout);
  const etag = headResponse.headers.get("etag") ?? undefined;
  const lastModified = headResponse.headers.get("last-modified") ?? undefined;

  if (state?.etag && state.etag === etag) {
    try {
      const stats = await stat(outputPath);
      if (stats.size > 0) {
        return {
          filePath: outputPath,
          hash: state.hash ?? "unknown",
          size: stats.size,
          skipped: true,
        };
      }
    } catch {
      // fichier manquant, on continue le téléchargement
    }
  }
  if (state?.lastModified && state.lastModified === lastModified) {
    try {
      const stats = await stat(outputPath);
      if (stats.size > 0) {
        return {
          filePath: outputPath,
          hash: state.hash ?? "unknown",
          size: stats.size,
          skipped: true,
        };
      }
    } catch {
      // fichier manquant, on continue le téléchargement
    }
  }

  let attempt = 0;
  while (true) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.downloadTimeoutMs);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const body = response.body;
      if (!body) throw new Error("Empty response body");

      const nodeStream = Readable.fromWeb(body as any);
      const hash = createHash("sha256");
      let size = 0;
      const hashTransform = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          hash.update(chunk);
          size += chunk.length;
          callback(null, chunk);
        },
      });

      const fileStream = createWriteStream(outputPath);
      await pipeline(nodeStream, hashTransform, fileStream);

      const finalHash = hash.digest("hex");
      await writeState(config, {
        url,
        etag,
        lastModified,
        hash: finalHash,
        downloadedAt: new Date().toISOString(),
      });

      return { filePath: outputPath, hash: finalHash, size, skipped: false };
    } catch (err) {
      attempt++;
      if (attempt >= config.downloadRetries) {
        throw new Error(
          `Failed to download ${url} after ${config.downloadRetries} attempts: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      const backoff = Math.min(1_000 * 2 ** attempt, 30_000);
      await delay(backoff);
    }
  }
}
