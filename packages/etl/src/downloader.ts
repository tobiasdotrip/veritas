import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { pipeline } from "node:stream/promises";
import { fetch } from "undici";
import { createHash } from "node:crypto";

export interface DownloadResult {
  filePath: string;
  hash: string;
  size: number;
}

export async function downloadZip(
  url: string,
  outputPath: string
): Promise<DownloadResult> {
  await mkdir(dirname(outputPath), { recursive: true });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download ${url}: ${response.status} ${response.statusText}`
    );
  }

  const hash = createHash("sha256");
  let size = 0;

  const body = response.body;
  if (!body) {
    throw new Error("Empty response body");
  }

  const fileStream = createWriteStream(outputPath);

  body.on("data", (chunk: Buffer) => {
    hash.update(chunk);
    size += chunk.length;
  });

  await pipeline(body, fileStream);

  return {
    filePath: outputPath,
    hash: hash.digest("hex"),
    size,
  };
}
