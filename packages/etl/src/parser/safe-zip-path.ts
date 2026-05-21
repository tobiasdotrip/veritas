import { isAbsolute, relative, resolve, sep } from "node:path";

/**
 * Ensures a resolved path stays within baseDir (guards against path traversal).
 */
export function assertPathWithinDir(baseDir: string, targetPath: string): string {
  const base = resolve(baseDir);
  const target = resolve(targetPath);
  const rel = relative(base, target);

  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`Path escapes base directory: ${targetPath}`);
  }

  return target;
}

/**
 * Ensures a ZIP entry name cannot escape the destination directory (zip slip).
 */
export function resolveSafeZipEntryPath(
  tempDir: string,
  entryName: string,
  isSymlink?: boolean
): string {
  if (!entryName || typeof entryName !== "string") {
    throw new Error("Invalid ZIP entry name");
  }
  if (entryName.includes("\0")) {
    throw new Error("Invalid ZIP entry name: null byte");
  }
  if (isSymlink) {
    throw new Error(`ZIP entry is a symlink: ${entryName}`);
  }
  if (isAbsolute(entryName) || entryName.startsWith("/") || entryName.startsWith("\\")) {
    throw new Error(`Invalid ZIP entry name: absolute path (${entryName})`);
  }
  if (/^[a-zA-Z]:[/\\]/.test(entryName)) {
    throw new Error(`Invalid ZIP entry name: drive path (${entryName})`);
  }

  return assertPathWithinDir(tempDir, resolve(tempDir, entryName));
}
