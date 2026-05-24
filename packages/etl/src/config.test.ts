import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateEtlUrl, ensureTempDir, type EtlConfig } from "./config.js";
import { rm } from "node:fs/promises";

describe("validateEtlUrl", () => {
  it("accepts a valid AN HTTPS URL", () => {
    const url = "https://data.assemblee-nationale.fr/static/openData/test.zip";
    expect(validateEtlUrl(url, "test")).toBe(url);
  });

  it("throws on HTTP URL", () => {
    expect(() =>
      validateEtlUrl("http://data.assemblee-nationale.fr/test.zip", "test"),
    ).toThrow("test URL must use HTTPS");
  });

  it("throws on invalid host", () => {
    expect(() => validateEtlUrl("https://evil.com/test.zip", "test")).toThrow(
      "test URL host must be data.assemblee-nationale.fr",
    );
  });

  it("throws on URL with credentials", () => {
    expect(() =>
      validateEtlUrl(
        "https://user:pass@data.assemblee-nationale.fr/test.zip",
        "test",
      ),
    ).toThrow("test URL must not contain credentials");
  });

  it("throws on invalid URL format", () => {
    expect(() => validateEtlUrl("not-a-url", "test")).toThrow(
      "Invalid test URL: not-a-url",
    );
  });

  it("rejects URL with punycode homograph host", () => {
    // Cyrillic 'е' (U+0435) instead of Latin 'e' (U+0065)
    const homograph = "https://data.assеmblee-nationale.fr/test.zip";
    expect(() => validateEtlUrl(homograph, "test")).toThrow(
      "test URL host must be data.assemblee-nationale.fr",
    );
  });

  it("rejects URL with userinfo (host confusion attack)", () => {
    // evil.com@data.assemblee-nationale.fr → parsed.username = "evil.com"
    expect(() =>
      validateEtlUrl(
        "https://evil.com@data.assemblee-nationale.fr/test.zip",
        "test",
      ),
    ).toThrow("test URL must not contain credentials");
  });

  it("allows URL with standard port 443", () => {
    const url = "https://data.assemblee-nationale.fr:443/test.zip";
    expect(validateEtlUrl(url, "test")).toBe(url);
  });

  it("rejects non-standard port in production", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      expect(() =>
        validateEtlUrl(
          "https://data.assemblee-nationale.fr:8080/test.zip",
          "test",
        ),
      ).toThrow("test URL must use standard HTTPS port");
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("allows non-standard port in development", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const url = "https://data.assemblee-nationale.fr:8080/test.zip";
      expect(validateEtlUrl(url, "test")).toBe(url);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});

describe("defaultConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.ETL_URL_SCRUTINS;
    delete process.env.ETL_URL_DEPUTIES;
    delete process.env.ETL_URL_ORGANES;
    delete process.env.TEMP_DIR;
    delete process.env.DOWNLOAD_TIMEOUT_MS;
    delete process.env.DOWNLOAD_RETRIES;
    delete process.env.DOWNLOAD_MAX_SIZE_BYTES;
    delete process.env.EXTRACT_MAX_FILES;
    delete process.env.EXTRACT_MAX_TOTAL_UNCOMPRESSED_BYTES;
    delete process.env.ETL_SHA256_SCRUTINS;
    delete process.env.ETL_SHA256_DEPUTIES;
    delete process.env.ETL_SHA256_ORGANES;
    delete process.env.ETL_SHA256_AMENDMENTS;
    delete process.env.BATCH_SIZE;
    delete process.env.SCRUTIN_TX_SIZE;
    delete process.env.LEGISLATURE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("reads custom env vars via dynamic import", async () => {
    process.env.ETL_URL_SCRUTINS =
      "https://data.assemblee-nationale.fr/custom.zip";
    process.env.TEMP_DIR = "/custom/tmp";
    process.env.DOWNLOAD_TIMEOUT_MS = "30000";
    process.env.DOWNLOAD_RETRIES = "5";
    process.env.DOWNLOAD_MAX_SIZE_BYTES = "1048576";
    process.env.EXTRACT_MAX_FILES = "20000";
    process.env.EXTRACT_MAX_TOTAL_UNCOMPRESSED_BYTES = "2097152";
    process.env.ETL_SHA256_SCRUTINS =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    process.env.BATCH_SIZE = "500";
    process.env.SCRUTIN_TX_SIZE = "50";
    process.env.LEGISLATURE = "16";

    const { defaultConfig: dynamicConfig } = await import("./config.js");

    expect(dynamicConfig.urls.scrutins).toBe(
      "https://data.assemblee-nationale.fr/custom.zip",
    );
    expect(dynamicConfig.tempDir).toBe("/custom/tmp");
    expect(dynamicConfig.downloadTimeoutMs).toBe(30_000);
    expect(dynamicConfig.downloadRetries).toBe(5);
    expect(dynamicConfig.downloadMaxSizeBytes).toBe(1_048_576);
    expect(dynamicConfig.extractMaxFiles).toBe(20_000);
    expect(dynamicConfig.extractMaxTotalUncompressedBytes).toBe(2_097_152);
    expect(dynamicConfig.checksums.scrutins).toBe(
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    );
    expect(dynamicConfig.batchSize).toBe(500);
    expect(dynamicConfig.scrutinTransactionSize).toBe(50);
    expect(dynamicConfig.legislature).toBe("16");
  });

  it("throws when SHA-256 env format is invalid", async () => {
    process.env.ETL_SHA256_SCRUTINS = "not-a-hash";
    await expect(import("./config.js")).rejects.toThrow(
      "scrutins SHA-256 must be a 64-char hex string",
    );
  });
});

describe("ensureTempDir", () => {
  const testDir = "/tmp/etl-test-vitest";

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("creates the temp directory recursively without error", async () => {
    const config: EtlConfig = {
      tempDir: testDir,
      urls: { scrutins: "", deputies: "", organes: "", amendments: "" },
      downloadTimeoutMs: 0,
      downloadRetries: 0,
      downloadMaxSizeBytes: 0,
      extractMaxFiles: 0,
      extractMaxTotalUncompressedBytes: 0,
      checksums: {},
      batchSize: 0,
      scrutinTransactionSize: 0,
      legislature: "17",
    };
    await expect(ensureTempDir(config)).resolves.not.toThrow();
  });
});
