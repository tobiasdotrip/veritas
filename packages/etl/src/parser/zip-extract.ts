import StreamZip from "node-stream-zip";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertSafeZipArchive,
  assertJsonZipEntry,
  isZipEntrySymlink,
  type ZipEntryAttributes,
} from "./zip-entry-type.js";

type AsyncZip = {
  entries: () => Promise<Record<string, ZipEntryAttributes>>;
  extract: (name: string, path: string) => Promise<void>;
  close: () => Promise<void>;
};

function openZip(zipPath: string): AsyncZip {
  const StreamZipAsync = (
    StreamZip as unknown as { async: new (opts: { file: string }) => AsyncZip }
  ).async;
  return new StreamZipAsync({ file: zipPath });
}

/**
 * Extracts ALL JSON entries from a zip subdirectory (e.g. "json/acteur/")
 * into a flat directory on disk. Returns the list of extracted file paths.
 */
export async function extractAllJsonFromZipDir(
  zipPath: string,
  tempDir: string,
  subDir: string,
): Promise<string[]> {
  const zip = openZip(zipPath);

  try {
    const entries = await zip.entries();
    assertSafeZipArchive(entries);

    const jsonEntries = Object.entries(entries).filter(
      ([name, entry]) =>
        name.startsWith(`${subDir}/`) &&
        name.endsWith(".json") &&
        !entry.isDirectory,
    );

    if (jsonEntries.length === 0) {
      throw new Error(`No JSON entries found in ${subDir}/ within ${zipPath}`);
    }

    const outDir = resolve(tempDir, subDir);
    await mkdir(outDir, { recursive: true });

    const extractedPaths: string[] = [];
    for (const [name, entry] of jsonEntries) {
      if (isZipEntrySymlink(entry)) {
        console.warn(`[etl] Skipping symlink entry in zip: ${name}`);
        continue;
      }
      const fileName = name.split("/").pop()!;
      const outPath = resolve(outDir, fileName);
      await zip.extract(name, outPath);
      extractedPaths.push(outPath);
    }

    return extractedPaths;
  } finally {
    await zip.close();
  }
}

/**
 * Extracts the first JSON entry from a ZIP archive (legacy, for scrutins
 * where the zip contains a single large JSON file).
 *
 * Security note: symlink entries are rejected and paths are validated against
 * zip slip, but a TOCTOU race remains if a concurrent process creates a
 * symlink at the target path between validation and extraction. Run the ETL
 * in an isolated environment (dedicated container/volume, no shared temp dir).
 */
export async function extractJsonEntryFromZip(
  zipPath: string,
  tempDir: string,
): Promise<string> {
  const zip = openZip(zipPath);

  try {
    const entries = await zip.entries();
    assertSafeZipArchive(entries);

    const jsonEntry = Object.values(entries).find((e) =>
      e.name.endsWith(".json"),
    );
    if (!jsonEntry) {
      throw new Error(`No JSON entry found in ${zipPath}`);
    }
    assertJsonZipEntry(jsonEntry);

    const resolvedPath = resolveSafeZipEntryPath(tempDir, jsonEntry.name);
    await zip.extract(jsonEntry.name, resolvedPath);
    return resolvedPath;
  } finally {
    await zip.close();
  }
}

function resolveSafeZipEntryPath(tempDir: string, entryName: string): string {
  const resolved = resolve(tempDir, entryName);
  if (!resolved.startsWith(resolve(tempDir))) {
    throw new Error(`Unsafe zip entry path: ${entryName} (zip slip attempt)`);
  }
  return resolved;
}
