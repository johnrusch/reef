---
phase: 18
plan: 01
subsystem: reef-storage
tags: [storage, crypto, sha256, zod, tdd, source-hash]
dependency_graph:
  requires: [Phase 17 ReefStorageService, ReefMetaJson, ReefMetaSchema]
  provides: [sourceHash field in ReefMetaJson, computeSourceHash function]
  affects: [Phase 18 Plan 02 write pipeline, Phase 19 read-path staleness detection]
tech_stack:
  added: [sourceHashService.ts using Node.js crypto.createHash]
  patterns: [TDD red-green, path-sorted deterministic hashing, ENOENT-tolerant file reading]
key_files:
  created:
    - src/main/services/reef/sourceHashService.ts
    - tests/unit/main/services/sourceHashService.test.ts
    - tests/unit/main/services/reefStorageTypes.test.ts
  modified:
    - src/main/services/reef/reefStorageTypes.ts
decisions:
  - "sourceHash is optional in ReefMetaSchema for backward compatibility with pre-Phase-18 .meta.json files"
  - "computeSourceHash sorts file paths before hashing so input order does not affect the digest"
  - "File path included in hash input so renaming a file changes the hash even if content is identical"
  - "ENOENT files silently skipped to handle analyzer race conditions; other errors re-thrown"
metrics:
  duration_minutes: 2
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 18 Plan 01: sourceHash Schema Extension and Hash Utility Summary

Optional sourceHash field added to ReefMetaJson schema and deterministic SHA-256 computeSourceHash utility created using Node.js crypto, with 9 passing unit tests covering schema backward compatibility and hash behavior.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend ReefMetaJson with optional sourceHash field | 0d32e09 | src/main/services/reef/reefStorageTypes.ts, tests/unit/main/services/reefStorageTypes.test.ts |
| 2 | Create sourceHashService with computeSourceHash function | 87c4020 | src/main/services/reef/sourceHashService.ts, tests/unit/main/services/sourceHashService.test.ts |

TDD commits:
- Task 1 RED+GREEN combined: `0d32e09` — schema test + one-line implementation (tests fail without the field, pass with it)
- Task 2 RED: failing import of non-existent module (module-not-found error)
- Task 2 GREEN: `87c4020` — full implementation with all 6 sourceHashService tests passing

## What Was Built

### reefStorageTypes.ts (modified)
- Added `sourceHash: z.string().optional()` as the last field in `ReefMetaSchema`
- `ReefMetaJson` type now includes `sourceHash?: string` automatically via Zod inference
- All 16 existing reefStorageService tests pass unchanged

### sourceHashService.ts (new)
- `computeSourceHash(filePaths: string[]): Promise<string>` — exported async function
- Uses `crypto.createHash('sha256')` from Node.js stdlib (no new dependencies)
- Sorts file paths before hashing for determinism regardless of input order
- Includes file path in hash update so renaming a file changes the digest
- Silently skips files with ENOENT error code; rethrows other errors
- Returns 64-character lowercase hex string

### Tests (9 passing)
- `reefStorageTypes.test.ts` (3 tests): sourceHash parses as hex string, parses when omitted, parses real SHA-256 hex
- `sourceHashService.test.ts` (6 tests): 64-char hex format, determinism, content-change detection, order-independence, empty list, ENOENT skip

## Deviations from Plan

None — plan executed exactly as written.

## Verification

```
npx vitest run --config vitest.config.main.ts tests/unit/main/services/reefStorageService.test.ts tests/unit/main/services/sourceHashService.test.ts
# Result: 22 passed (22)

npm run typecheck
# Result: no errors
```

## Known Stubs

None — computeSourceHash is fully implemented with real file I/O and crypto.

## Self-Check: PASSED

- [x] src/main/services/reef/reefStorageTypes.ts contains `sourceHash: z.string().optional()`
- [x] src/main/services/reef/sourceHashService.ts exists and exports `computeSourceHash`
- [x] tests/unit/main/services/sourceHashService.test.ts exists with 6 test cases
- [x] tests/unit/main/services/reefStorageTypes.test.ts exists with 3 test cases
- [x] Commit 0d32e09 exists (Task 1)
- [x] Commit 87c4020 exists (Task 2)
- [x] 22 tests pass (16 existing + 3 schema + 6 hash)
- [x] TypeScript compiles without errors
