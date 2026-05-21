import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { resolveSafeZipEntryPath } from "./safe-zip-path.js";

describe("resolveSafeZipEntryPath", () => {
  const tempDir = "/tmp/etl";

  it("resolves a safe relative path", () => {
    const result = resolveSafeZipEntryPath(tempDir, "data/file.json");
    expect(result).toBe(resolve(tempDir, "data/file.json"));
  });

  it("resolves a flat filename", () => {
    const result = resolveSafeZipEntryPath(tempDir, "file.json");
    expect(result).toBe(resolve(tempDir, "file.json"));
  });

  it("throws on null byte in entry name", () => {
    expect(() => resolveSafeZipEntryPath(tempDir, "file\0.json")).toThrow(
      "Invalid ZIP entry name: null byte",
    );
  });

  it("throws on empty entry name", () => {
    expect(() => resolveSafeZipEntryPath(tempDir, "")).toThrow(
      "Invalid ZIP entry name",
    );
  });

  it("throws on absolute Unix path", () => {
    expect(() => resolveSafeZipEntryPath(tempDir, "/etc/passwd")).toThrow(
      "Invalid ZIP entry name: absolute path",
    );
  });

  it("throws on absolute Windows path", () => {
    expect(() =>
      resolveSafeZipEntryPath(tempDir, "C:\\Windows\\System32"),
    ).toThrow("Invalid ZIP entry name: drive path");
  });

  it("throws on backslash absolute path", () => {
    expect(() => resolveSafeZipEntryPath(tempDir, "\\etc\\passwd")).toThrow(
      "Invalid ZIP entry name: absolute path",
    );
  });

  it("throws on directory traversal (..)", () => {
    expect(() => resolveSafeZipEntryPath(tempDir, "../secret.txt")).toThrow(
      "Path escapes base directory",
    );
  });

  it("throws on nested directory traversal", () => {
    expect(() =>
      resolveSafeZipEntryPath(tempDir, "data/../../../secret.txt"),
    ).toThrow("Path escapes base directory");
  });

  it("throws on traversal in the middle of the path", () => {
    expect(() =>
      resolveSafeZipEntryPath(tempDir, "foo/../bar/../../secret.txt"),
    ).toThrow("Path escapes base directory");
  });

  it("allows safe paths containing .. that do not escape", () => {
    const result = resolveSafeZipEntryPath(tempDir, "data/subdir/../file.json");
    expect(result).toBe(resolve(tempDir, "data/subdir/../file.json"));
  });

  it("throws on non-string entry name", () => {
    expect(() =>
      resolveSafeZipEntryPath(tempDir, null as unknown as string),
    ).toThrow("Invalid ZIP entry name");
  });

  it("throws on symlink entry", () => {
    expect(() => resolveSafeZipEntryPath(tempDir, "link.json", true)).toThrow(
      "ZIP entry is a symlink: link.json",
    );
  });
});
