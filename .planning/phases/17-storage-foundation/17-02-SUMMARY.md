---
phase: 17-storage-foundation
plan: "02"
subsystem: file-watcher
tags: [chokidar, ignored-predicate, stor-03, file-watching, regression-guard]
dependency_graph:
  requires: []
  provides: [STOR-03-chokidar-exclusion]
  affects: [src/main/services/fileWatcherService.ts]
tech_stack:
  added: []
  patterns: [regex-predicate-extension]
key_files:
  created: []
  modified:
    - src/main/services/fileWatcherService.ts
    - tests/unit/main/services/fileWatcherService.test.ts
decisions:
  - "Used ($|[/\\\\]) variant instead of [/\\\\] alone to catch bare .reef directory path emitted by chokidar on directory creation (per RESEARCH.md Pitfall 1)"
metrics:
  duration: "~5 min"
  completed: "2026-03-27T02:54:28Z"
  tasks_completed: 1
  files_modified: 2
requirements: [STOR-03]
---

# Phase 17 Plan 02: FileWatcherService .reef/ Exclusion Summary

## One-liner

Extend chokidar ignored predicate with `\.reef($|[/\\])` to prevent `.reef/` writes from triggering false stale-diagram events, satisfying STOR-03.

## What Was Built

Extended the single-line regex in the `ignored` function predicate of `FileWatcherService.startWatching` to include `.reef` directory exclusion. Also added a new `describe('.reef/ exclusion (STOR-03)')` block with 7 test cases covering the full exclusion surface.

### Files Modified

**`src/main/services/fileWatcherService.ts` (line 57)**

Before:
```
/node_modules|\.git[/\\]|[/\\]dist[/\\]|dist-electron|\.cache|[/\\]build[/\\]|[/\\]coverage[/\\]/.test(filePath)
```

After:
```
/node_modules|\.git[/\\]|[/\\]dist[/\\]|dist-electron|\.cache|[/\\]build[/\\]|[/\\]coverage[/\\]|\.reef($|[/\\])/.test(filePath)
```

**`tests/unit/main/services/fileWatcherService.test.ts`**

Added 7 test cases in a new `describe('.reef/ exclusion (STOR-03)')` block:
- `ignores .reef/context.puml path` → `true`
- `ignores .reef/component/api-server/diagram.svg path` → `true`
- `ignores bare .reef directory path` → `true`
- `ignores .reef with backslash separator (Windows)` → `true`
- `does NOT ignore path containing just "reef" without dot` → `false`
- `still ignores node_modules (regression check)` → `true`
- `still ignores .git (regression check)` → `true`

## Decisions Made

- **`($|[/\\])` variant over `[/\\]` alone**: chokidar emits the bare `.reef` path (no trailing slash) when the directory itself is created. The `($|[/\\])` covers both the bare directory creation event and all child paths. This prevents a missed ignore on initial `.reef/` directory creation.

## Verification

```
npx vitest run --config vitest.config.main.ts tests/unit/main/services/fileWatcherService.test.ts
```

Result: **27 tests passed (20 pre-existing + 7 new)**

TypeScript: `npm run typecheck` — clean, no errors.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this is a pure regex + test change with no data stubs.

## Self-Check: PASSED

- `src/main/services/fileWatcherService.ts` contains `\.reef($|[/\\])`
- `tests/unit/main/services/fileWatcherService.test.ts` contains `.reef/context.puml` and `STOR-03`
- Commit `31a8596` exists and contains both files
- All 27 tests pass with exit code 0
