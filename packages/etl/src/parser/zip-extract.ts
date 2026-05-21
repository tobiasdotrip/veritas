import StreamZip from "node-stream-zip";
import { resolveSafeZipEntryPath } from "./safe-zip-path.js";

interface ZipEntry {
  name: string;
  attr: number;
}

function isZipEntrySymlink(entry: ZipEntry): boolean {
  // Info-ZIP stores Unix file mode in the upper 16 bits of external attributes
  const mode = (entry.attr >>> 16) & 0xffff;
  return (mode & 0o170000) === 0o120000; // S_IFLNK
}

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
        entries: () => Promise<Record<string, ZipEntry>>;
        extract: (name: string, path: string) => Promise<void>;
        close: () => Promise<void>;
      };
    }
  ).async({ file: zipPath });

  try {
    const entries = await zip.entries();
    const jsonEntry = Object.values(entries).find((e) =>
      e.name.endsWith(".json"),
    );
    if (!jsonEntry) {
      throw new Error(`No JSON entry found in ${zipPath}`);
    }

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
