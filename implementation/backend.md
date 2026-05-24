# Implementation Report: Texte des amendements dans les scrutins

## Summary

Implemented the full feature chain for displaying amendment text on scrutin pages in Veritas.

## Files Created

### 1. `packages/etl/src/parser/amendments.ts` (NEW)

- `extractAmendmentsJsonFromZip()` — extracts amendment JSON files from `Amendements.json.zip` while capturing `dossierRef` from the zip directory structure (`amendements/<dossierRef>/<file>.json`)
- `parseAmendment()` — parses a single amendment JSON, strips HTML from `dispositif` and `exposeSommaire`, extracts `auteurs` as structured JSONB
- `parseAmendmentsFromZip()` — async generator yielding all `ParsedAmendment` entries
- HTML entity decoding: handles `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&nbsp;`, numeric entities

### 2. `packages/etl/src/matcher.ts` (NEW)

- `extractAmendmentNumber()` — regex to parse amendment number from scrutin titles
  - Pattern: `/(?:l'amendement|le sous-amendement|l'amendement de suppression)\s+n[°o]\s*(\d+)(?:\s*\(rect\.\))?/i`
- `runAmendmentMatching()` — two-phase matching:
  - **Phase 1 (dossierRef)**: When an amendment number appears in exactly one dossier across all amendments, it's a high-confidence match (0.95)
  - **Phase 2 (titre)**: Fallback — when multiple candidates exist, picks the first (heuristic, 0.80 confidence). Uses `onConflictDoNothing` to preserve Phase 1 matches

## Files Modified

### 3. `packages/shared/src/db/schema.ts`

- Added `amendments` table (10 columns, 3 indexes)
- Added `scrutinAmendments` table (6 columns, 3 indexes, 2 FKs)
- Added relations: `amendments → scrutinAmendments`, `scrutins → scrutinAmendments`, `scrutinAmendments → scrutin + amendment`
- Added `jsonb` import from drizzle-orm/pg-core

### 4. `packages/etl/src/config.ts`

- Added `amendments` URL to `DEFAULT_URLS` and `EtlConfig.urls`
- Added `ETL_URL_AMENDMENTS` env var support with validation

### 5. `packages/etl/src/loader.ts`

- Added `loadAmendments()` — batch insert with `onConflictDoUpdate` for idempotent ETL
- Batched by `config.batchSize` within transactions

### 6. `packages/etl/src/index.ts`

- Step numbering updated: 1/5 → 5/5 (was 1/4 → 4/4)
- Added Step 5: download `Amendements.json.zip`, parse, load, then run matching
- Exported `matcher` module
- Added `amendments` and `matching` fields to `PipelineResult`

### 7. `packages/etl/src/parser/index.ts`

- Added `export * from "./amendments.js"`

### 8. `apps/backend/src/modules/scrutins/repository.ts`

- `getWithDetails()`: added join from `scrutinAmendments` → `amendments`
- Returns `amendment` (single match, `.limit(1)`) with: id, numero, dispositif, exposeSommaire, sortCode, articleRef, auteurs (jsonb), matchMethod, confidence

### 9. `apps/backend/src/modules/scrutins/routes.ts`

- Added `AmendmentSchema` (Zod) matching the repository's return shape
- `ScrutinDetailSchema` extended with `amendment: AmendmentSchema.nullable()`

### 10. `packages/etl/.env`

- Added `ETL_URL_AMENDMENTS=https://data.assemblee-nationale.fr/static/openData/repository/17/loi/amendements_div_legis/Amendements.json.zip`

### 11. `packages/etl/src/config.test.ts`

- Added `amendments: ""` to test config and `EtlConfig` import

## Database Migration

- Generated: `apps/backend/drizzle/0001_true_spectrum.sql`
- Creates `amendments` table and `scrutin_amendments` table
- Applied successfully via `drizzle-kit migrate`

## Verification

- ✅ `tsc --noEmit` passes on `@veritas/shared`
- ✅ `tsc --noEmit` passes on `@veritas/etl`
- ✅ `tsc --noEmit` passes on `@veritas/backend`
- ✅ `@veritas/etl` tests: 36 passed (5 files)
- ✅ `@veritas/shared` tests: 28 passed (1 file)
- ✅ `@veritas/backend` tests: 76 passed (8 files)
- ✅ Migration SQL generated and applied

## Patterns Applied

- **Idempotent ETL**: `onConflictDoUpdate` on amendment ID, `onConflictDoNothing` on links
- **Batch transactions**: Amendments loaded in `config.batchSize` batches
- **Streaming parse**: Async generators for zip reading
- **Two-phase matching**: dossierRef (high confidence) → titre (fallback)
- **HTML stripping**: Regex-based with entity decoding (no extra dependencies)
- **Zip safety**: Path traversal protection, symlink rejection, safe zip entry validation
- **TypeScript strict**: No `any` types, explicit `| undefined` on optional fields, `!` assertions only where guarded
- **API shape**: Consistent `{ data }` envelope, Zod validation, `nullable()` for optional
