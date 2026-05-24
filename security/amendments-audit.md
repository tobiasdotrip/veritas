# Security Audit Report — Feature « Texte des amendements dans les scrutins »

**Date**: 2026-05-24
**Auditor**: Security Engineer (shift-left)
**Scope**: Full security review of the amendments display feature for Veritas
**Verdict**: **APPROVED-WITH-MITIGATIONS** — No critical vulnerabilities. 2 findings require action before production: zip bomb hardening (Medium) and supply chain integrity (Medium). 3 Informational items.

---

## Executive Summary

La feature télécharge un zip de 272 Mo depuis `data.assemblee-nationale.fr`, extrait 111K+ fichiers JSON d'amendements, parse le contenu (strip HTML), stocke dans PostgreSQL, matche les amendements aux scrutins, et affiche le texte côté frontend React.

Le code montre une maturité sécurité satisfaisante : validation d'URL source, rejet des redirects, protection zip-slip, rate limiting, CSP/Helmet, CORS production restrictif, gestion d'erreurs générique côté client, Drizzle ORM (requêtes paramétrées).

**Deux vulnérabilités Medium** à corriger avant mise en production : absence de limite sur le nombre de fichiers / taille extraite du zip, et absence de vérification d'intégrité (checksum) du zip téléchargé.

---

## Threat Model (STRIDE)

| Interaction                 | S                    | T                                 | R                 | I                          | D                                            | E   | Risk       | Mitigation                                               |
| --------------------------- | -------------------- | --------------------------------- | ----------------- | -------------------------- | -------------------------------------------- | --- | ---------- | -------------------------------------------------------- |
| Téléchargement zip AN → ETL | —                    | MITM via downgrade HTTP           | Logs ETL couvrent | URL publique, pas de fuite | Zip bomb 272 Mo → OK, extraction non limitée | —   | **Medium** | ⚠️ Extraction non bornée                                 |
| Extraction zip → disque     | —                    | Zip slip, symlink                 | Logs ETL          | Paths temp dans logs       | Bombe de décompression (ratio >100:1)        | —   | **Low**    | ✅ `resolveSafeZipEntryPath`, `assertSafeZipArchive`     |
| Parsing JSON amendements    | uid forgé            | Structure JSON malveillante       | —                 | —                          | JSON profond (stack overflow)                | —   | **Low**    | ✅ `JSON.parse` natif + try/catch                        |
| Strip HTML amendements      | XSS via `<script>`   | —                                 | —                 | —                          | —                                            | —   | **Low**    | ✅ strip regex + React échappement automatique           |
| Stockage PostgreSQL         | —                    | —                                 | —                 | SQLi via dispositif        | —                                            | —   | **Low**    | ✅ Drizzle ORM paramétré                                 |
| Matching scrutin↔amendement | —                    | —                                 | —                 | —                          | —                                            | —   | **Info**   | Pas de surface d'attaque                                 |
| Affichage frontend React    | XSS via `dispositif` | URL injection `buildAssembleeUrl` | —                 | —                          | —                                            | —   | **Low**    | ✅ React échappement texte + `rel="noopener noreferrer"` |
| API routes `/scrutins/:id`  | —                    | —                                 | —                 | Fuite auteurs              | —                                            | —   | **Low**    | ✅ Zod validation + rate limiting                        |

---

## Findings

### [VULN-001] Absence de limite sur la taille et le nombre de fichiers extraits du zip

| Field        | Value                                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Severity** | 🟠 **Medium**                                                                                                                                                                  |
| **Category** | CWE-409 / OWASP-A05:2021                                                                                                                                                       |
| **STRIDE**   | Denial of Service                                                                                                                                                              |
| **Location** | `packages/etl/src/parser/amendments.ts:100-124`                                                                                                                                |
| **Impact**   | Un zip malveillant (ou corrompu) pourrait contenir un nombre arbitraire de fichiers ou un ratio de compression extrême (>100:1), saturant le disque ou la mémoire du nœud ETL. |
| **Evidence** |

```typescript
// amendments.ts:100-124 — aucune limite sur le nombre ou la taille extraite
for (const [name, entry] of amendEntries) {
  // ... skiplink check ...
  const outPath = resolveSafeZipEntryPath(outDir, fileName);
  await zip.extract(name, outPath); // ⚠️ pas de compteur, pas de limite de taille
  results.push({ filePath: outPath, dossierRef });
}
```

Le téléchargement est limité à 500 Mo (`downloadMaxSizeBytes`), mais la **taille décompressée** n'est pas contrôlée. Un zip de 100 Mo avec un ratio 100:1 produirait 10 Go sur le disque.

| **Remediation** |

1. Ajouter un compteur d'entrées avec une limite (ex: 200 000 fichiers max).
2. Suivre la taille cumulée des fichiers extraits avec une limite (ex: 2x `downloadMaxSizeBytes`).
3. Vérifier que le `compressedSize` et `size` des entrées zip sont cohérents (pas de ratio > 100:1 suspect).

```typescript
const MAX_EXTRACTED_FILES = 200_000;
const MAX_EXTRACTED_BYTES = config.downloadMaxSizeBytes * 2;
let extractedFiles = 0;
let extractedBytes = 0;

for (const [name, entry] of amendEntries) {
  if (++extractedFiles > MAX_EXTRACTED_FILES) {
    throw new Error(`Too many files in zip: ${extractedFiles}`);
  }
  if (entry.size && entry.size > 50 * 1024 * 1024) {
    console.warn(
      `[etl] Skipping oversized entry: ${name} (${entry.size} bytes)`,
    );
    continue;
  }
  // ... extract ...
  extractedBytes += entry.size ?? 0;
  if (extractedBytes > MAX_EXTRACTED_BYTES) {
    throw new Error(`Extracted size exceeds limit: ${extractedBytes} bytes`);
  }
}
```

---

### [VULN-002] Absence de vérification d'intégrité du zip téléchargé (supply chain)

| Field        | Value                                                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity** | 🟠 **Medium**                                                                                                                                                                                                       |
| **Category** | CWE-494 / OWASP-A06:2021                                                                                                                                                                                            |
| **STRIDE**   | Tampering                                                                                                                                                                                                           |
| **Location** | `packages/etl/src/downloader.ts:98-140`                                                                                                                                                                             |
| **Impact**   | Si le serveur de l'Assemblée Nationale est compromis (ou si un MITM contourne TLS), le zip téléchargé pourrait contenir des données forgées. Le hash SHA-256 est calculé mais jamais comparé à une valeur attendue. |
| **Evidence** |

```typescript
// downloader.ts:98-140 — le hash est calculé et stocké, jamais vérifié
const hash = createHash("sha256");
const hashTransform = new Transform({ ... hash.update(chunk); ... });
// ...
const finalHash = hash.digest("hex");
await writeState(config, { url, etag, lastModified, hash: finalHash, ... });
// ⚠️ finalHash n'est jamais comparé à une valeur connue
```

| **Remediation** |

1. Ajouter une variable d'environnement `AMENDMENTS_EXPECTED_SHA256` contenant le hash SHA-256 attendu.
2. Après téléchargement, comparer `finalHash` avec cette valeur.
3. Optionnel : vérifier une signature PGP si l'AN en fournit une.

```typescript
const expectedHash = process.env.AMENDMENTS_EXPECTED_SHA256;
if (expectedHash && finalHash !== expectedHash) {
  throw new Error(
    `Checksum mismatch for ${url}: expected ${expectedHash}, got ${finalHash}`,
  );
}
```

4. Documenter la procédure de mise à jour du hash attendu lors des mises à jour du dataset AN.

---

### [VULN-003] Injection URL potentielle dans le lien Assemblée Nationale

| Field        | Value                                                                                                                                                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity** | 🟢 **Low**                                                                                                                                                                                                                             |
| **Category** | CWE-79 / URL Injection                                                                                                                                                                                                                 |
| **Location** | `apps/frontend/src/components/scrutin/AmendmentCard.tsx:23-25`                                                                                                                                                                         |
| **Impact**   | Si un `uid` d'amendement contenait des sauts de ligne ou des caractères de contrôle, le lien `href` pourrait être corrompu. La source étant l'AN (confiance relative), et React échappant l'attribut `href`, l'impact est très limité. |
| **Evidence** |

```typescript
function buildAssembleeUrl(amendmentId: string): string {
  return `https://www.assemblee-nationale.fr/dyn/17/amendements/${amendmentId}`;
  // ⚠️ amendmentId n'est pas validé (uid brut du JSON AN)
}
```

Le `amendmentId` vient de `raw.uid` dans le JSON AN, stocké tel quel en base, puis passé au frontend. Aucune validation de format (ex: `/^AMANR\d+L\d+N\d+$/`).

| **Remediation** |

Ajouter une validation du format de l'UID dans l'ETL (`parseAmendment`) avant stockage :

```typescript
const AMENDMENT_UID_RE = /^AMANR\d+L\d+N\d+$/;
export function parseAmendment(wrapper, dossierRef): ParsedAmendment {
  const raw = wrapper.amendement;
  if (!AMENDMENT_UID_RE.test(raw.uid)) {
    throw new Error(`Invalid amendment UID format: ${raw.uid}`);
  }
  // ...
}
```

Ou, a minima, dans le frontend, encoder l'ID dans l'URL :

```typescript
function buildAssembleeUrl(amendmentId: string): string {
  const safe = amendmentId.replace(/[^\w-]/g, "");
  return `https://www.assemblee-nationale.fr/dyn/17/amendements/${safe}`;
}
```

---

### [VULN-004] Fuite de chemins locaux dans les logs ETL

| Field        | Value                                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Severity** | 🔵 **Info**                                                                                                                       |
| **Category** | CWE-532 / OWASP-A09:2021                                                                                                          |
| **Location** | `packages/etl/src/parser/amendments.ts:150,158`                                                                                   |
| **Impact**   | En cas d'erreur de parsing JSON, le chemin complet du fichier temporaire est loggé, exposant la structure du système de fichiers. |
| **Evidence** |

```typescript
console.warn(
  `[etl] Failed to parse amendment JSON ${entry.filePath}: ...`,
  // ⚠️ entry.filePath = chemin absolu dans /tmp ou ./tmp/etl
);
```

| **Remediation** |

Utiliser le nom du fichier (basename) ou le `dossierRef` + numéro dans les logs :

```typescript
console.warn(
  `[etl] Failed to parse amendment JSON (dossier=${entry.dossierRef}, file=${basename(entry.filePath)}): ...`,
);
```

---

### [VULN-005] Duplication de `resolveSafeZipEntryPath` moins robuste

| Field        | Value                                                                                                                                                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity** | 🔵 **Info**                                                                                                                                                                                                                                                                                                         |
| **Category** | CWE-1041 / Code Quality                                                                                                                                                                                                                                                                                             |
| **Location** | `packages/etl/src/parser/zip-extract.ts:71-78`                                                                                                                                                                                                                                                                      |
| **Impact**   | `zip-extract.ts` contient une version dupliquée et moins robuste de `resolveSafeZipEntryPath` qui n'utilise pas `assertPathWithinDir` du module partagé. Cette version n'est pas utilisée par le code des amendements (qui utilise la version correcte de `safe-zip-path.ts`), mais c'est un risque de maintenance. |
| **Evidence** |

```typescript
// zip-extract.ts:71-78 — version obsolète, sans null byte check, sans drive letter check
function resolveSafeZipEntryPath(tempDir: string, entryName: string): string {
  const resolved = resolve(tempDir, entryName);
  if (!resolved.startsWith(resolve(tempDir))) {
    // ⚠️ préfix check, moins robuste
    throw new Error(`Unsafe zip entry path: ${entryName} (zip slip attempt)`);
  }
  return resolved;
}
```

Comparer avec `packages/etl/src/parser/safe-zip-path.ts` qui vérifie null bytes, chemins absolus, lettres de lecteur Windows, et utilise `assertPathWithinDir`.

| **Remediation** |

Supprimer la fonction dupliquée dans `zip-extract.ts` et importer `resolveSafeZipEntryPath` depuis `safe-zip-path.ts`.

---

## Checklist — Contrôles de sécurité

### ✅ Input Validation

| Check                             | Result                                                      |
| --------------------------------- | ----------------------------------------------------------- |
| Validation URL source ETL         | ✅ URL.parse + HTTPS + host check + credential check        |
| Validation schéma JSON amendement | ⚠️ Pas de Zod — `JSON.parse` + `as` cast, puis field access |
| Validation UID amendement         | ❌ Aucun format check (voir VULN-003)                       |
| Validation `numero` amendement    | ❌ Aucune — tombe à `"0"` si absent                         |
| Validation `dossierRef`           | ✅ Extrait du chemin zip, pas du JSON                       |

### ✅ Output Encoding

| Check                     | Result                                                                   |
| ------------------------- | ------------------------------------------------------------------------ |
| HTML strip avant stockage | ✅ `stripHtml()` — tags + entités HTML courantes                         |
| React rendu texte         | ✅ JSX `{dispositif}` → React échappe automatiquement                    |
| `dangerouslySetInnerHTML` | ✅ Un seul usage dans `seo.ts` (JSON-LD, intentionnel, contenu contrôlé) |
| `innerHTML`               | ✅ Usage unique dans `seo.ts` pour JSON-LD                               |

### ✅ Authentication & Authorization

| Check              | Result                                                      |
| ------------------ | ----------------------------------------------------------- |
| Routes protégées   | ✅ Aucune route de mutation pour les amendements (GET only) |
| Rate limiting      | ✅ 60 req/min global                                        |
| Session management | N/A — pas d'authentification utilisateur sur cette feature  |

### ✅ Secrets Management

| Check                | Result                                          |
| -------------------- | ----------------------------------------------- |
| Secrets dans le code | ✅ Aucun trouvé                                 |
| `DATABASE_URL`       | ✅ Via `process.env`                            |
| `POSTGRES_PASSWORD`  | ✅ Via variable d'environnement, requis en prod |
| URL dans le code     | ⚠️ URLs AN en dur (intentionnel, public)        |

### ✅ Dependency Review

| Check             | Result                                                    |
| ----------------- | --------------------------------------------------------- |
| Nouveaux packages | `node-stream-zip@^1.15.0` (dernière version stable)       |
| CVEs connues      | Aucune CVE critique publiée pour `node-stream-zip@1.15.0` |
| Maintenance       | Package actif, dernière release < 6 mois                  |
| License           | MIT ✅                                                    |

### ✅ HTTPS/TLS & Headers

| Check           | Result                                                            |
| --------------- | ----------------------------------------------------------------- |
| CORS production | ✅ `origin: false` = same-origin uniquement                       |
| CSP             | ✅ `default-src 'self'`, `script-src 'self'`, `object-src 'none'` |
| HSTS            | ✅ Via Helmet (par défaut)                                        |
| `X-Robots-Tag`  | ✅ `noindex, nofollow`                                            |
| `robots.txt`    | ✅ `Disallow: /`                                                  |

### ✅ Error Handling

| Check                    | Result                                   |
| ------------------------ | ---------------------------------------- |
| Messages d'erreur client | ✅ Génériques (Problem Details RFC 7807) |
| Stack traces côté client | ✅ Jamais exposées                       |
| Logs internes            | ✅ `req.log.error` avec stack (interne)  |
| Validation errors        | ✅ Zod → 400 avec détails                |

### ✅ Supply Chain

| Check                        | Result                                                  |
| ---------------------------- | ------------------------------------------------------- |
| URL source validée           | ✅ HTTPS + host = `data.assemblee-nationale.fr`         |
| Redirects                    | ✅ Rejetés (`redirect: "manual"`)                       |
| Timeout téléchargement       | ✅ 120s par défaut                                      |
| Taille max téléchargement    | ✅ 500 MB                                               |
| Retry avec backoff           | ✅ Exponential backoff, 3 tentatives                    |
| Hash SHA-256 calculé         | ✅                                                      |
| Vérification checksum        | ❌ Aucune comparaison avec hash attendu (voir VULN-002) |
| ETag / Last-Modified caching | ✅                                                      |

### ✅ Path Traversal & Zip Security

| Check                       | Result                                 |
| --------------------------- | -------------------------------------- |
| Zip slip (chemins absolus)  | ✅ `resolveSafeZipEntryPath` bloque    |
| Zip slip (drive letters)    | ✅ Bloqué                              |
| Null bytes dans noms        | ✅ Bloqué                              |
| Symlinks dans zip           | ✅ Détectés et rejetés                 |
| FIFO / device / socket      | ✅ `assertSafeZipArchive` bloque       |
| Utilisation de `basename()` | ✅ Extrait seulement le nom du fichier |
| Limite de fichiers extraits | ❌ Aucune (voir VULN-001)              |
| Ratio de compression        | ❌ Non vérifié (voir VULN-001)         |

---

## Résumé des actions requises

| Priority           | ID       | Action                                                             | Effort |
| ------------------ | -------- | ------------------------------------------------------------------ | ------ |
| 🔴 **Before prod** | VULN-001 | Ajouter limite fichiers extraits + limite taille décompressée      | 30 min |
| 🔴 **Before prod** | VULN-002 | Implémenter vérification checksum SHA-256 attendu                  | 15 min |
| 🟡 **Sprint next** | VULN-003 | Valider le format UID amendement à l'ETL                           | 10 min |
| 🟡 **Sprint next** | VULN-005 | Supprimer `resolveSafeZipEntryPath` dupliqué dans `zip-extract.ts` | 5 min  |
| 🔵 **Backlog**     | VULN-004 | Anonymiser les chemins dans les logs ETL                           | 5 min  |

---

## Verdict final

**APPROVED-WITH-MITIGATIONS** — La feature est bien conçue du point de vue sécurité. Les protections existantes (Helmet/CSP, CORS restrictif, rate limiting, ORM paramétré, défenses zip-slip, strip HTML + React escaping) forment une défense en profondeur solide.

Les deux findings **Medium** (VULN-001 et VULN-002) doivent être corrigés avant le déploiement en production. Les trois findings Low/Info peuvent être traités dans le sprint suivant.

Aucun blocage critique détecté.
