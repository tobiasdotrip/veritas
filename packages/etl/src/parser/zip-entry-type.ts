export interface ZipEntryAttributes {
  name: string;
  attr?: number;
  isDirectory?: boolean;
}

const S_IFMT = 0o170000;
const S_IFREG = 0o100000;
const S_IFLNK = 0o120000;
const S_IFIFO = 0o010000;
const S_IFCHR = 0o020000;
const S_IFBLK = 0o060000;
const S_IFSOCK = 0o140000;

const UNSAFE_ZIP_ENTRY_TYPES = new Set([
  S_IFLNK,
  S_IFIFO,
  S_IFCHR,
  S_IFBLK,
  S_IFSOCK,
]);

/** Info-ZIP stores Unix file mode in the upper 16 bits of external attributes. */
export function getZipEntryUnixMode(
  entry: ZipEntryAttributes,
): number | undefined {
  if (entry.attr === undefined) {
    return undefined;
  }
  return (entry.attr >>> 16) & 0xffff;
}

export function getZipEntryFileType(
  entry: ZipEntryAttributes,
): number | undefined {
  const mode = getZipEntryUnixMode(entry);
  if (mode === undefined) {
    return undefined;
  }
  return mode & S_IFMT;
}

export function isZipEntrySymlink(entry: ZipEntryAttributes): boolean {
  return getZipEntryFileType(entry) === S_IFLNK;
}

export function isZipEntryRegularFile(entry: ZipEntryAttributes): boolean {
  if (entry.isDirectory) {
    return false;
  }
  const fileType = getZipEntryFileType(entry);
  if (fileType === undefined) {
    return true;
  }
  return fileType === S_IFREG;
}

export function assertSafeZipArchive(
  entries: Record<string, ZipEntryAttributes>,
): void {
  for (const entry of Object.values(entries)) {
    const fileType = getZipEntryFileType(entry);
    if (fileType !== undefined && UNSAFE_ZIP_ENTRY_TYPES.has(fileType)) {
      throw new Error(`Unsafe ZIP entry type: ${entry.name}`);
    }
  }
}

export function assertJsonZipEntry(entry: ZipEntryAttributes): void {
  if (entry.isDirectory) {
    throw new Error(`ZIP JSON entry is a directory: ${entry.name}`);
  }
  if (isZipEntrySymlink(entry)) {
    throw new Error(`ZIP entry is a symlink: ${entry.name}`);
  }
  if (!isZipEntryRegularFile(entry)) {
    throw new Error(`ZIP JSON entry is not a regular file: ${entry.name}`);
  }
}
