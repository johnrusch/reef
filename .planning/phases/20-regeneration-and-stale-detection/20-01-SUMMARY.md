---
phase: 20-regeneration-and-stale-detection
plan: 01
subsystem: reef-staleness
tags: [staleness, hash, file-watching, ipc, tdd]
dependency_graph:
  requires:
    - 18-write-path (sourceHashService, reefStorageService)
    - 19-read-path (analyzedFilePathsCache in c4AnalyzerService)
  provides:
    - ReefStalenessService with debounced hash comparison
    - FileWatcherService wired with reef staleness detection
  affects:
    - src/main/services/fileWatcherService.ts
    - src/main/main.ts
tech_stack:
  added: []
  patterns:
    - TDD (RED → GREEN) with vi.useFakeTimers for debounce testing
    - Dependency injection: ReefStorageService + onStale callback passed to constructor
    - Debounce via Map<string, NodeJS.Timeout> per "repoPath:level" key
    - Additive wiring: mtime-based staleness continues working alongside hash-based
key_files:
  created:
    - src/main/services/reef/reefStalenessService.ts
    - tests/unit/main/reefStalenessService.test.ts
  modified:
    - src/main/services/fileWatcherService.ts
    - src/main/main.ts
decisions:
  - 2500ms debounce (within D-04 2-3s range) to balance responsiveness and hash thrashing prevention
  - Additive wiring: ReefStalenessService.scheduleCheck called after existing mtime check, not replacing it
  - Falls back to getWatchPathFiles() filesystem discovery when analyzedFilePathsCache is empty
  - onStale callback in main.ts emits c4-storage:state-changed IPC event (reuses existing pipeline)
metrics:
  duration: 13min
  completed: "2026-03-28"
  tasks: 2
  files: 4
---

# Phase 20 Plan 01: ReefStalenessService Summary

Hash-based staleness detection with 2.5s debounce wired into FileWatcherService via dependency injection.

## What Was Built

**ReefStalenessService** (`src/main/services/reef/reefStalenessService.ts`):
- `scheduleCheck(repoPath, level)`: debounces 2500ms per "repoPath:level" key (per D-04)
- `checkStaleness(repoPath, level)`: reads `.meta.json` sourceHash via `ReefStorageService.readMeta()`, recomputes hash via `computeSourceHash()`, calls `onStale` callback if they differ
- `getWatchPathFiles(repoPath, level)`: fallback file discovery when `analyzedFilePathsCache` is empty; mirrors `FileWatcherService.getWatchPaths()` scope
- `dispose()`: clears all pending debounce timers on teardown

**FileWatcherService wiring** (`src/main/services/fileWatcherService.ts`):
- Added optional `reefStalenessService` as 3rd constructor parameter
- `handleFileChange` calls `this.reefStalenessService?.scheduleCheck(repoPath, level)` after existing mtime check (additive, does not replace)
- `stopAllWatchers` calls `this.reefStalenessService?.dispose()`
- `initializeFileWatcherService` signature extended with optional `reefStalenessService` parameter

**main.ts wiring** (`src/main/main.ts`):
- Creates `ReefStalenessService` with `new ReefStorageService()` and an `onStale` callback that emits `c4-storage:state-changed` IPC events to all BrowserWindows
- Passes the instance to `initializeFileWatcherService` as the third argument

## Tests

8 tests passing in `tests/unit/main/reefStalenessService.test.ts`:

1. Debounce: multiple scheduleCheck calls within 2.5s → single hash comparison
2. Separate keys: different repoPath:level → independent debounce timers
3. Stale detection: different hashes → onStale called with (repoPath, level)
4. Fresh stays fresh: matching hashes → no onStale call
5. Null meta: readMeta returns null → no hash computation, returns false
6. Missing sourceHash: meta exists but no sourceHash → returns false
7. Per-level independence: only the specified level's meta is read
8. Dispose: cancels pending timers before they fire

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vi.mock('fs/promises') format**
- **Found during:** Task 1 GREEN phase
- **Issue:** Original mock `vi.mock('fs/promises', () => ({ readdir: ..., stat: ... }))` fails in Vitest when the imported module (`reefStalenessService.ts`) uses `fs/promises` — Vitest requires `importOriginal` pattern to avoid "No default export" error
- **Fix:** Changed to `vi.mock('fs/promises', async (importOriginal) => { const actual = await importOriginal(); return { ...actual, readdir: vi.fn(), stat: vi.fn() }; })`
- **Files modified:** `tests/unit/main/reefStalenessService.test.ts`
- **Commit:** included in `feat(20-01)` GREEN commit

### Out-of-Scope Pre-existing Issues

- `tests/unit/main/services/fileWatcherService.test.ts` — same fs/promises mock issue in pre-existing test (present before plan 20-01 changes). Logged as deferred; not introduced by this plan.

## Known Stubs

None — all features are fully implemented.

## Self-Check: PASSED

- [x] `src/main/services/reef/reefStalenessService.ts` exists and exports `ReefStalenessService`
- [x] `tests/unit/main/reefStalenessService.test.ts` exists and 8/8 tests pass
- [x] `fileWatcherService.ts` contains `reefStalenessService.scheduleCheck(repoPath, level)`
- [x] `fileWatcherService.ts` contains `reefStalenessService?.dispose()`
- [x] `initializeFileWatcherService` includes `reefStalenessService` parameter
- [x] `main.ts` creates `ReefStalenessService` and passes to `initializeFileWatcherService`
- [x] `npx tsc --noEmit` exits 0
