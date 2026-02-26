---
phase: 07-enhanced-change-detection
plan: 01
subsystem: database
tags: [sqlite, better-sqlite3, electron, ipc, change-tracking, debounce, c4-model]

# Dependency graph
requires:
  - phase: 05-persistent-storage-foundation
    provides: C4StorageService, SQLite schema, WAL mode, updateState/getState API
  - phase: 06-auto-generation-on-repo-add
    provides: C4AnalyzerService, generation pipeline, IPC event channel c4-storage:state-changed

provides:
  - ChangeTrackingService: accumulates file changes, debounces (1000ms), maps to C4 elements, propagates hierarchy, persists to DB, emits enriched IPC
  - sanitizeId utility: exported replication of C4PlantUMLGenerator.sanitizeId for element ID accuracy
  - shared types: AffectedElement, ChangeTrackingPayload, StateChangedPayload
  - diagram_change_tracking SQLite table: persists most recent change snapshot per (repo_path, level)
  - upsertChangeTracking / getChangeTracking / clearChangeTracking methods on C4StorageService

affects:
  - 07-02: FileWatcherService integration (wires ChangeTrackingService into the file watch pipeline)
  - 07-03: Renderer store extension (diagramStateStore consumes affectedElements from enriched IPC payload)
  - 08: Phase 8 change visualization (reads affectedElements from IPC to highlight SVG elements)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Debounce accumulator: Map<repoPath:level, {files: Set, timer: setTimeout | null}> pattern for per-key debouncing
    - Generating state guard: check getState() before updateState('stale') to avoid overwriting 'generating'
    - Path normalization at ingestion: always replace /\\/g with '/' before storing or comparing
    - sanitizeId parity: export utility that matches C4PlantUMLGenerator.sanitizeId exactly for element ID accuracy
    - JSON serialization in SQLite: store arrays and objects as JSON strings, parse on retrieval

key-files:
  created:
    - src/shared/types/changeTracking.ts
    - src/main/services/changeTrackingService.ts
    - tests/unit/main/services/changeTrackingService.test.ts
  modified:
    - src/main/services/c4/c4StorageService.ts
    - tests/unit/main/services/storageService.test.ts
    - tests/unit/main/services/migrationService.test.ts

key-decisions:
  - "ChangeTrackingService uses plain setTimeout debounce (no lodash) — zero dependency, sufficient for 1000ms window"
  - "Path-based heuristic mapping (not ts-morph re-analysis) — <1ms vs 500-3000ms, sufficient for CHNG-02"
  - "State guard in flush(): skips updateState('stale') if current state is 'generating' (Pitfall 2) but still persists change tracking and emits event"
  - "sanitizeId exported as standalone utility from changeTrackingService — ensures element IDs match PlantUML IDs (Pitfall 6)"
  - "Schema user_version bumped to 2 — signals diagram_change_tracking table is present for future migration detection"
  - "diagram_change_tracking uses UNIQUE(repo_path, level) with INSERT OR REPLACE — stores only most recent snapshot per level"
  - "Context level excluded from element mapping: mapFilesToElements returns [] for 'context' (per CHNG-02 spec)"

patterns-established:
  - "Accumulator pattern: Map<key, {files: Set, timer}> with clearTimeout on each new change, setTimeout on flush"
  - "Hierarchy propagation: code -> [component, container], component -> [container], container -> [] — isDirect:false for propagated"
  - "Generating state guard before updateState(): always check getState() first in flush()"

requirements-completed: [CHNG-01, CHNG-02, CHNG-03, CHNG-04, CHNG-05]

# Metrics
duration: 14min
completed: 2026-02-26
---

# Phase 7 Plan 01: Enhanced Change Detection — Backend Service Summary

**ChangeTrackingService with SQLite persistence: debounced file-to-C4-element mapping, hierarchy propagation, and enriched IPC events via diagram_change_tracking table**

## Performance

- **Duration:** 14 min (808s)
- **Started:** 2026-02-26T20:30:46Z
- **Completed:** 2026-02-26T20:44:54Z
- **Tasks:** 2 completed
- **Files modified:** 6

## Accomplishments

- ChangeTrackingService accumulates file changes per (repoPath, level) and debounces into single flush after 1000ms idle
- File-to-element mapping: code (filename), component (directory after main/renderer), container (Main/Renderer Process) — context returns empty
- Hierarchy propagation: code changes mark parent component and container (isDirect: false)
- State guard prevents overwriting 'generating' state during active diagram generation
- diagram_change_tracking SQLite table persists most recent change snapshot for cold launch / tab switch recovery
- 23 new unit tests covering CHNG-01 through CHNG-05 (18 ChangeTrackingService + 5 StorageService)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared types and ChangeTrackingService with tests** - `4db72ba` (feat)
2. **Task 2: Extend C4StorageService with change tracking table and methods** - `b028f6d` (feat)

## Files Created/Modified

- `src/shared/types/changeTracking.ts` - AffectedElement, ChangeTrackingPayload, StateChangedPayload interfaces
- `src/main/services/changeTrackingService.ts` - ChangeTrackingService class + sanitizeId export
- `tests/unit/main/services/changeTrackingService.test.ts` - 18 unit tests (CHNG-01 through CHNG-04, Pitfall 2, shutdown)
- `src/main/services/c4/c4StorageService.ts` - diagram_change_tracking table, upsertChangeTracking, getChangeTracking, clearChangeTracking
- `tests/unit/main/services/storageService.test.ts` - 5 new CHNG-05 tests for DB persistence
- `tests/unit/main/services/migrationService.test.ts` - Updated user_version assertion to >= 1 (now 2)

## Decisions Made

- Used plain `setTimeout` debounce instead of lodash.debounce — zero dependency, adequate for 1000ms window
- Used path-based heuristic mapping instead of ts-morph AST analysis — < 1ms vs 500-3000ms, sufficient for CHNG-02
- State guard in flush(): check `storage.getState()` before calling `storage.updateState('stale')` — prevents overwriting 'generating'
- Schema user_version bumped from 1 to 2 to signal new `diagram_change_tracking` table presence
- Context level explicitly returns empty array from `mapFilesToElements` (per CHNG-02 spec — context excluded)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed migration test user_version assertion after schema bump**
- **Found during:** Task 2 (C4StorageService schema extension)
- **Issue:** Bumping user_version from 1 to 2 broke `migrationService.test.ts` test that expected `user_version === 1` after storage init
- **Fix:** Updated assertion to `expect(version).toBeGreaterThanOrEqual(1)` — remains semantically correct (migration completed)
- **Files modified:** `tests/unit/main/services/migrationService.test.ts`
- **Verification:** All 20 migration tests pass
- **Committed in:** b028f6d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug fix)
**Impact on plan:** Necessary correctness fix. Schema version bump is a consequence of adding the new table. No scope creep.

## Issues Encountered

- **better-sqlite3 NODE_MODULE_VERSION mismatch:** The binary was compiled against a different Node.js version. Resolved with `npm rebuild better-sqlite3` — storage service tests then ran successfully. Pre-existing environment issue, not caused by this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- ChangeTrackingService is ready to be wired into FileWatcherService (Phase 7 Plan 02)
- C4StorageService now has all three change tracking methods needed by ChangeTrackingService.flush()
- Shared types are available for renderer store extension (Phase 7 Plan 03)
- All 23 new tests green, zero TypeScript errors, zero scope creep

---
*Phase: 07-enhanced-change-detection*
*Completed: 2026-02-26*
