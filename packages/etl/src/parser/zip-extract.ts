import StreamZip from "node-stream-zip";
import { resolveSafeZipEntryPath } from "./safe-zip-path.js";
import {
  assertJsonZipEntry,
  assertSafeZipArchive,
  isZipEntrySymlink,
  type ZipEntryAttributes,
} from "./zip-entry-type.js";

/**
 * Extracts the first JSON entry from a ZIP archive.
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
  const zip = new (
    StreamZip as unknown as {
      async: new (opts: { file: string }) => {
        entries: () => Promise<Record<string, ZipEntryAttributes>>;
        extract: (name: string, path: string) => Promise<void>;
        close: () => Promise<void>;
      };
    }
  ).async({ file: zipPath });

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

    const extractedPath = resolveSafeZipEntryPath(
      tempDir,
      jsonEntry.name,
      isZipEntrySymlink(jsonEntry),
    );
    await zip.extract(jsonEntry.name, extractedPath);
    return extractedPath;
  } finally {
    await zip.close();
  }
}
