---
phase: 19-read-path
plan: "01"
subsystem: reef-import-pipeline
tags: [import, sqlite, lru, ipc, reef]
dependency_graph:
  requires:
    - "18-02: writeReefArtifacts writes .reef/ artifacts (source of files being read)"
    - "src/main/services/reef/reefStorageService.ts (readMeta)"
    - "src/main/services/c4/c4StorageService.ts (storeDiagram, storeSvg)"
    - "src/main/services/plantUmlService.ts (SvgLruCache)"
  provides:
    - "importReefArtifacts function for scanning .reef/ and importing to SQLite + LRU"
    - "reef-import:scan-and-import IPC channel"
    - "window.reef.reefImport.scanAndImport preload bridge"
  affects:
    - "19-02: renderer will call reefImport.scanAndImport on repo add"
tech_stack:
  added: []
  patterns:
    - "TDD (RED/GREEN): failing tests written before implementation"
    - "vi.hoisted() for mock variable hoisting across vi.mock() boundaries"
    - "Per-level try/catch with console.warn for non-fatal error handling"
    - "Dependency injection: storageService and lruCache passed as params for testability"
key_files:
  created:
    - path: src/main/services/reef/reefImportService.ts
      exports: [importReefArtifacts, ReefImportResult]
      lines: 127
    - path: tests/unit/main/services/reefImportService.test.ts
      tests: 10
      lines: 276
  modified:
    - path: src/main/services/c4/c4StorageHandlers.ts
      change: "Added import of importReefArtifacts, registered reef-import:scan-and-import IPC handler"
    - path: src/main/preload.ts
      change: "Added reefImport namespace to ReefAPI interface and reefAPI object"
decisions:
  - "Dependency injection over singleton creation: importReefArtifacts accepts storageService and lruCache as params — IPC handler passes singletons (getStorageService(), svgLruCache)"
  - "Only flat levels scanned (context, container) per ADV-01 — component/code are SQLite-only"
  - "SVG as primary import signal: SVG absent = missingLevels; PUML/meta absent = graceful fallback"
  - "LRU cache key format: repoPath:level: (trailing colon) matches c4StorageHandlers.ts line 185 format"
metrics:
  duration_seconds: 210
  completed_date: "2026-03-27"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
---

# Phase 19 Plan 01: Reef Import Service Summary

**One-liner:** Backend import pipeline scanning `.reef/` to import SVG/PUML/meta into SQLite + LRU cache via a new IPC handler `reef-import:scan-and-import`.

## What Was Built

The complete backend for the READ-01/READ-02/READ-03 requirements:

1. **`reefImportService.ts`** — exports `importReefArtifacts(repoPath, storageService, lruCache)` which:
   - Checks `.reef/` existence via `fs/promises.access()` — returns empty result if missing (no error)
   - Scans flat levels `['context', 'container']` only (component/code are SQLite-only per ADV-01)
   - For each level: reads `{level}.svg`, then optionally `{level}.puml` and `{level}.meta.json`
   - Calls `storeDiagram` with state `'fresh'`, modelUsed/promptVersion from meta or `'imported'` fallback
   - Calls `storeSvg` to populate the `svg_content` SQLite column
   - Calls `lruCache.set` with key `${repoPath}:${level}:` (matches c4StorageHandlers.ts format)
   - Per-level try/catch with `console.warn` — one level failure does not block others
   - Returns `{ importedLevels, missingLevels }`

2. **IPC handler** in `c4StorageHandlers.ts` — `'reef-import:scan-and-import'` passes singletons `getStorageService()` and `svgLruCache` to `importReefArtifacts`

3. **Preload bridge** in `preload.ts` — `window.reef.reefImport.scanAndImport(repoPath)` typed as `Promise<{ importedLevels: string[]; missingLevels: string[] }>`

## Test Coverage

All 10 behaviors from the plan are tested:

| # | Behavior | Status |
|---|---------|--------|
| 1 | Both SVGs present → importedLevels: [context, container] | PASS |
| 2 | Only context.svg → importedLevels: [context], missingLevels: [container] | PASS |
| 3 | No .reef/ dir → empty result, no SQLite calls | PASS |
| 4 | .reef/ exists, no SVGs → empty importedLevels | PASS |
| 5 | storeDiagram called with modelUsed from meta, state: fresh | PASS |
| 6 | storeSvg called per level with SVG content | PASS |
| 7 | lruCache.set called with key `repoPath:level:` (D-05) | PASS |
| 8 | Missing/invalid .meta.json → uses 'imported' fallback (D-06) | PASS |
| 9 | Missing .puml → storeDiagram with empty string diagramContent | PASS |
| 10 | One level failure → continues importing other levels | PASS |

## Verification Results

- `npx vitest run tests/unit/main/services/reefImportService.test.ts` — 10/10 pass
- `npx tsc --noEmit` — exits 0 (no type errors)
- `c4StorageHandlers.reef.test.ts` — 9/9 pass (no regressions)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.mock() hoisting requires vi.hoisted() for mock variables**
- **Found during:** Task 1 TDD RED phase
- **Issue:** `vi.mock('fs/promises', ...)` factory referenced `mockAccess` and `mockReadFile` variables defined at module scope, but `vi.mock` is hoisted before variable initialization — caused `ReferenceError: Cannot access 'mockAccess' before initialization`
- **Fix:** Wrapped all mock function variables in `vi.hoisted()` — standard Vitest pattern for this scenario
- **Files modified:** `tests/unit/main/services/reefImportService.test.ts`
- **Commit:** 106be8d

**2. [Rule 1 - Bug] fs/promises ESM mock requires default export**
- **Found during:** Task 1 TDD GREEN phase
- **Issue:** Vitest ESM mock of `fs/promises` failed with "No 'default' export is defined on the mock" because the mock factory only provided named exports (`access`, `readFile`) without a `default` key
- **Fix:** Added `default: { access: mockAccess, readFile: mockReadFile }` to the mock factory alongside the named exports
- **Files modified:** `tests/unit/main/services/reefImportService.test.ts`
- **Commit:** 106be8d

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | `106be8d` | `feat(19-01): implement importReefArtifacts with SQLite + LRU import` |
| Task 2 | `9ed3965` | `feat(19-01): register reef-import IPC handler and preload bridge` |

## Known Stubs

None — all data flows are wired. The `importReefArtifacts` function reads real files and writes to real SQLite/LRU interfaces. The IPC handler uses the production singletons.

## Self-Check: PASSED
- `src/main/services/reef/reefImportService.ts` — FOUND
- `tests/unit/main/services/reefImportService.test.ts` — FOUND
- Commit `106be8d` — FOUND
- Commit `9ed3965` — FOUND
