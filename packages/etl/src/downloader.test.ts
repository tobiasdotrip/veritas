import { describe, expect, it } from "vitest";
import { getSha256FromDigestHeader } from "./downloader.js";

describe("getSha256FromDigestHeader", () => {
  it("extracts SHA-256 from digest header", () => {
    const expectedHex =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const b64 = Buffer.from(expectedHex, "hex").toString("base64");

    expect(getSha256FromDigestHeader(`sha-256=${b64}`)).toBe(expectedHex);
  });

  it("supports multi-algorithm digest header", () => {
    const expectedHex =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const b64 = Buffer.from(expectedHex, "hex").toString("base64");

    expect(getSha256FromDigestHeader(`md5=xyz, sha-256=${b64}`)).toBe(
      expectedHex,
    );
  });

  it("returns undefined for invalid value", () => {
    expect(getSha256FromDigestHeader("sha-256=not-base64")).toBeUndefined();
    expect(getSha256FromDigestHeader(null)).toBeUndefined();
  });
});
