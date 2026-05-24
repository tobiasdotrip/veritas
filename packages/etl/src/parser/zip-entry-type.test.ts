import { describe, expect, it } from "vitest";
import {
  assertJsonZipEntry,
  assertSafeZipArchive,
  assertZipExtractionLimits,
  getZipEntryFileType,
  getZipEntryUnixMode,
  isZipEntryRegularFile,
  isZipEntrySymlink,
} from "./zip-entry-type.js";

function entryWithMode(name: string, fileType: number, isDirectory = false) {
  const mode = fileType | 0o644;
  return {
    name,
    attr: mode << 16,
    isDirectory,
  };
}

describe("zip entry type detection", () => {
  it("reads Unix mode from external attributes", () => {
    const entry = entryWithMode("file.json", 0o100000);
    expect(getZipEntryUnixMode(entry)).toBe(0o100644);
    expect(getZipEntryFileType(entry)).toBe(0o100000);
  });

  it("detects symlink entries", () => {
    const entry = entryWithMode("link.json", 0o120000);
    expect(isZipEntrySymlink(entry)).toBe(true);
    expect(isZipEntryRegularFile(entry)).toBe(false);
  });

  it("accepts regular files without Unix mode metadata", () => {
    expect(
      isZipEntryRegularFile({ name: "file.json", isDirectory: false }),
    ).toBe(true);
  });

  it("rejects directories as JSON entries", () => {
    expect(() =>
      assertJsonZipEntry({ name: "data.json/", isDirectory: true }),
    ).toThrow("ZIP JSON entry is a directory: data.json/");
  });

  it("rejects symlink JSON entries", () => {
    expect(() =>
      assertJsonZipEntry(entryWithMode("link.json", 0o120000)),
    ).toThrow("ZIP entry is a symlink: link.json");
  });

  it("rejects non-regular special files as JSON entries", () => {
    expect(() =>
      assertJsonZipEntry(entryWithMode("pipe.json", 0o010000)),
    ).toThrow("ZIP JSON entry is not a regular file: pipe.json");
  });

  it("rejects unsafe entries anywhere in the archive", () => {
    expect(() =>
      assertSafeZipArchive({
        "data/file.json": entryWithMode("data/file.json", 0o100000),
        "etc/passwd": entryWithMode("etc/passwd", 0o120000),
      }),
    ).toThrow("Unsafe ZIP entry type: etc/passwd");
  });

  it("rejects extraction when file count exceeds limit", () => {
    expect(() =>
      assertZipExtractionLimits(
        [
          { name: "a.json", size: 1 },
          { name: "b.json", size: 1 },
        ],
        {
          maxFiles: 1,
          maxTotalUncompressedBytes: 10,
          label: "zip test",
        },
      ),
    ).toThrow("zip test exceeds max extracted files (2 > 1)");
  });

  it("rejects extraction when uncompressed size exceeds limit", () => {
    expect(() =>
      assertZipExtractionLimits(
        [
          { name: "a.json", size: 8 },
          { name: "b.json", size: 5 },
        ],
        {
          maxFiles: 10,
          maxTotalUncompressedBytes: 10,
          label: "zip test",
        },
      ),
    ).toThrow("zip test exceeds max uncompressed bytes (13 > 10)");
  });

  it("rejects entries with invalid size metadata", () => {
    expect(() =>
      assertZipExtractionLimits([{ name: "a.json" }], {
        maxFiles: 10,
        maxTotalUncompressedBytes: 10,
        label: "zip test",
      }),
    ).toThrow("ZIP entry has invalid uncompressed size: a.json");
  });
});
