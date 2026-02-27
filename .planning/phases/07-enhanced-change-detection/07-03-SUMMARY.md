---
phase: 07-enhanced-change-detection
plan: 03
subsystem: file-watching
tags: [chokidar, file-watching, bug-fix, change-detection, unit-tests]
dependency_graph:
  requires: [07-02]
  provides: [chokidar-v4-compatible-watching, extension-filtering, directory-walk-staleness]
  affects: [src/main/services/fileWatcherService.ts, tests/unit/main/services/fileWatcherService.test.ts]
tech_stack:
  added: []
  patterns: [directory-path-watching, function-predicate-ignored, recursive-directory-walk, event-handler-extension-filtering]
key_files:
  modified:
    - src/main/services/fileWatcherService.ts
  created:
    - tests/unit/main/services/fileWatcherService.test.ts
decisions:
  - "getWatchPaths returns concrete directory/file paths (no globs) — chokidar v4 removed glob support"
  - "ignored option uses function predicate — chokidar v4 anymatch uses exact string equality for string matchers, not glob expansion"
  - "isRelevantFile() extension filter in event handlers replaces glob expansion"
  - "isDiagramStale() uses recursive hasNewerFiles() directory walk instead of skipping glob patterns"
metrics:
  duration: 187s
  tasks_completed: 2
  files_modified: 1
  files_created: 1
  completed_date: "2026-02-27"
---

# Phase 7 Plan 03: Fix Chokidar v4 Glob Incompatibility Summary

**One-liner:** Fixed FileWatcherService to use chokidar v4 compatible directory paths, function predicate for ignored option, and recursive directory walk for startup staleness — replacing glob patterns that silently matched nothing in v4.

## What Was Built

### Task 1: Replace glob patterns with directory paths and extension filtering
**File:** `src/main/services/fileWatcherService.ts`
**Commits:** 6fa6edb

Replaced the glob-based `getFilePatterns()` method (which returned patterns like `src/**/*.ts` that chokidar v4 treats as literal paths) with:

1. **`getWatchPaths()`** — Returns concrete directory/file paths per C4 level:
   - `context`: `[package.json, tsconfig.json, src/]`
   - `container`: `[package.json, src/main/, src/renderer/]`
   - `component`/`code`: `[src/]`

2. **`isRelevantFile()`** — Extension filter per C4 level called in event handlers:
   - `context`: package.json, tsconfig.json, main.[jt]sx? entry points
   - `container`: all files (true)
   - `component`/`code`: .ts, .tsx, .js, .jsx

3. **Function predicate for `ignored` option** — Replaced glob string array with regex function predicate that chokidar v4 correctly evaluates (v4's bundled anymatch uses exact string equality for string matchers, not glob expansion).

4. **`isDiagramStale()` recursive walk** — Replaced the startup staleness check that skipped glob patterns with a proper recursive `hasNewerFiles()` directory walker that checks file extensions using `isRelevantFile()`.

### Task 2: Unit tests for directory-based watching and extension filtering
**File:** `tests/unit/main/services/fileWatcherService.test.ts`
**Commits:** 514bb19

Created 20 unit tests verifying all aspects of the fix:
- 4 tests: getWatchPaths contains no glob characters for all C4 levels
- 4 tests: isRelevantFile filters component/code level to TS/JS extensions only
- 2 tests: isRelevantFile passes all files for container level
- 2 tests: isRelevantFile filters context level to config and entry point files
- 2 tests: non-matching extension events do not trigger handleFileChange
- 2 tests: matching extension events do trigger handleFileChange
- 7 tests: ignored function predicate correctly excludes/allows paths

All 20 tests pass.

## Verification Results

1. `npm run typecheck` — PASS (zero errors)
2. `npx vitest run --config vitest.config.main.ts tests/unit/main/services/fileWatcherService.test.ts` — 20/20 tests pass
3. No glob patterns (`*`) appear in any path passed to `chokidar.watch()` — confirmed by grep
4. The `ignored` option is a function predicate — confirmed by Test 7 (typeof === 'function')
5. Pre-existing test failures in GitService.test.ts, migrationService.test.ts, storageService.test.ts are unrelated to this plan and outside scope

## Deviations from Plan

None — plan executed exactly as written.

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| `getWatchPaths()` returns concrete paths only | Chokidar v4 removed glob support — directory paths watched recursively via depth option |
| `ignored` uses function predicate | Chokidar v4 bundles anymatch which uses exact string equality for string matchers, not glob expansion |
| `isRelevantFile()` in event handlers | Replaces glob filtering that previously happened at watch-path level |
| `hasNewerFiles()` recursive directory walk | Startup staleness check previously skipped glob patterns, leaving directories unchecked |

## Impact

Unblocks UAT Tests 2 and 3:
- **UAT Test 2**: "File change triggers stale state" — FileWatcher now actually watches directory paths that exist, so file change events fire
- **UAT Test 3**: "Debounced batch processing" — Events now reach ChangeTrackingService's debounce mechanism

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/main/services/fileWatcherService.ts | FOUND |
| tests/unit/main/services/fileWatcherService.test.ts | FOUND |
| .planning/phases/07-enhanced-change-detection/07-03-SUMMARY.md | FOUND |
| Commit 6fa6edb (Task 1) | FOUND |
| Commit 514bb19 (Task 2) | FOUND |
