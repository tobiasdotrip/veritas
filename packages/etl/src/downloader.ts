import { createWriteStream, createReadStream } from "node:fs";
import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import type { EtlConfig } from "./config.js";
import { assertPathWithinDir } from "./parser/safe-zip-path.js";

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
  url: string,
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
  state: DownloadState,
): Promise<void> {
  await writeFile(
    getStatePath(config, state.url),
    JSON.stringify(state, null, 2),
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function assertNoRedirect(response: { status: number }, url: string): void {
  if (response.status >= 300 && response.status < 400) {
    throw new Error(
      `Redirect not allowed for ${url} (HTTP ${response.status})`,
    );
  }
}

async function fetchWithTimeout(
  url: string,
  method: "GET" | "HEAD",
  timeoutMs: number,
): Promise<Awaited<ReturnType<typeof fetch>>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method,
      redirect: "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function downloadZip(
  url: string,
  outputPath: string,
  config: EtlConfig,
  expectedSha256?: string,
): Promise<DownloadResult> {
  assertPathWithinDir(config.tempDir, outputPath);

  const state = await readState(config, url);

  const headResponse = await fetchWithTimeout(
    url,
    "HEAD",
    config.downloadTimeoutMs,
  );
  assertNoRedirect(headResponse, url);

  const etag = headResponse.headers.get("etag") ?? undefined;
  const lastModified = headResponse.headers.get("last-modified") ?? undefined;
  const checksumFromHead = getSha256FromDigestHeader(
    headResponse.headers.get("digest"),
  );
  const expectedChecksum = (expectedSha256 ?? checksumFromHead)?.toLowerCase();
  if (expectedChecksum && !/^[a-f0-9]{64}$/.test(expectedChecksum)) {
    throw new Error(`Invalid expected SHA-256 for ${url}`);
  }

  const tryReturnSkipped = async (): Promise<DownloadResult | undefined> => {
    try {
      const stats = await stat(outputPath);
      if (stats.size === 0) return undefined;

      if (expectedChecksum) {
        const fileHash = await hashFileSha256(outputPath);
        if (fileHash !== expectedChecksum) {
          throw new Error(
            `Checksum mismatch for cached file ${outputPath}: expected ${expectedChecksum}, got ${fileHash}`,
          );
        }
      }

      return {
        filePath: outputPath,
        hash: state?.hash ?? "unknown",
        size: stats.size,
        skipped: true,
      };
    } catch {
      return undefined;
    }
  };

  if (state?.etag && state.etag === etag) {
    const skipped = await tryReturnSkipped();
    if (skipped) return skipped;
  }
  if (state?.lastModified && state.lastModified === lastModified) {
    const skipped = await tryReturnSkipped();
    if (skipped) return skipped;
  }

  let attempt = 0;
  while (true) {
    try {
      const response = await fetchWithTimeout(
        url,
        "GET",
        config.downloadTimeoutMs,
      );
      assertNoRedirect(response, url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const body = response.body;
      if (!body) throw new Error("Empty response body");

      const nodeStream = Readable.fromWeb(body as never);
      const hash = createHash("sha256");
      let size = 0;
      const maxSize = config.downloadMaxSizeBytes;
      const hashTransform = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          size += chunk.length;
          if (size > maxSize) {
            callback(
              new Error(`Download exceeds maximum size of ${maxSize} bytes`),
            );
            return;
          }
          hash.update(chunk);
          callback(null, chunk);
        },
      });

      const fileStream = createWriteStream(outputPath);
      await pipeline(nodeStream, hashTransform, fileStream);

      const finalHash = hash.digest("hex");
      if (expectedChecksum && finalHash !== expectedChecksum) {
        throw new Error(
          `Checksum mismatch for ${url}: expected ${expectedChecksum}, got ${finalHash}`,
        );
      }
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
          `Failed to download ${url} after ${config.downloadRetries} attempts: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      const backoff = Math.min(1_000 * 2 ** attempt, 30_000);
      await delay(backoff);
    }
  }
}

export function getSha256FromDigestHeader(
  digestHeader: string | null,
): string | undefined {
  if (!digestHeader) return undefined;

  // RFC 3230 / RFC 9530 format example: "sha-256=BASE64"
  const parts = digestHeader.split(",").map((part) => part.trim());
  for (const part of parts) {
    const match = part.match(/^sha-256=([A-Za-z0-9+/=]+)$/i);
    if (!match?.[1]) continue;
    const hex = Buffer.from(match[1], "base64").toString("hex");
    if (/^[a-f0-9]{64}$/i.test(hex)) {
      return hex.toLowerCase();
    }
  }
  return undefined;
}

async function hashFileSha256(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }
  return hash.digest("hex");
}
