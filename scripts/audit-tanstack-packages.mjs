#!/usr/bin/env node
/**
 * Vérifie les versions @tanstack/* du lockfile contre l'IOC
 * CVE-2026-45321 / GHSA-g7cv-rxg3-hmpx (supply-chain 2026-05-11).
 *
 * Usage: node scripts/audit-tanstack-packages.mjs
 */
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MALICIOUS_OPT = "github:tanstack/router#79ac49eedf774dd4b0cfa308722bc463cfe5885c";
const MALICIOUS_VERSIONS = new Set([
  // Extrait GHSA-g7cv-rxg3-hmpx — versions à ne jamais installer
  "1.166.12", "1.166.15", "1.161.9", "1.161.12", "1.169.5", "1.169.8",
  "1.167.68", "1.167.71", "1.166.51", "1.166.54", "0.0.47", "0.0.50",
  "1.166.55", "1.166.58", "1.166.45", "1.166.48", "1.167.38", "1.167.41",
  "1.169.23", "1.169.26", "1.161.11", "1.161.14",
]);

function listTanstackSpecs() {
  const lock = readFileSync(join(process.cwd(), "pnpm-lock.yaml"), "utf8");
  const specs = new Map();
  const re = /['"](@tanstack\/[a-z0-9.-]+)@([\d.]+)/g;
  for (const m of lock.matchAll(re)) {
    if (!m[1].includes(">")) specs.set(m[1], m[2]);
  }
  return [...specs.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, version]) => `${name}@${version}`);
}

function inspect(spec) {
  const tmp = mkdtempSync(join(tmpdir(), "tanstack-audit-"));
  execSync(`npm pack ${spec} --pack-destination ${tmp}`, { stdio: "pipe" });
  const tgz = readdirSync(tmp).find((f) => f.endsWith(".tgz"));
  if (!tgz) throw new Error(`no tarball for ${spec}`);
  const full = join(tmp, tgz);
  const files = execSync(`tar -tzf ${JSON.stringify(full)}`, { encoding: "utf8" });
  const pkgJson = execSync(`tar -xOf ${JSON.stringify(full)} package/package.json`, {
    encoding: "utf8",
  });
  unlinkSync(full);
  const pkg = JSON.parse(pkgJson);
  const version = spec.split("@").pop();
  const issues = [];
  if (pkg.optionalDependencies?.["@tanstack/setup"] === MALICIOUS_OPT) {
    issues.push("optionalDependencies @tanstack/setup (IOC)");
  }
  if (files.includes("package/router_init.js")) {
    issues.push("router_init.js present");
  }
  if (MALICIOUS_VERSIONS.has(version)) {
    issues.push(`version ${version} listed in GHSA`);
  }
  return issues;
}

let failed = false;
console.log("Audit @tanstack/* (CVE-2026-45321)\n");
for (const spec of listTanstackSpecs()) {
  const issues = inspect(spec);
  if (issues.length) {
    failed = true;
    console.log(`FAIL ${spec}`);
    for (const i of issues) console.log(`  - ${i}`);
  } else {
    console.log(`OK   ${spec}`);
  }
}
if (failed) {
  console.error("\nDes paquets suspects ont été détectés. Réinstallez depuis des versions patchées.");
  process.exit(1);
}
console.log("\nAucun IOC détecté sur les versions du lockfile.");
