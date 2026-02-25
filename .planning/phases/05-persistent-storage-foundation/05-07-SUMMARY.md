---
phase: 05-persistent-storage-foundation
plan: 07
subsystem: ui
tags: [electron, ipc, file-watcher, chokidar, zustand, diagram-state]

# Dependency graph
requires:
  - phase: 05-persistent-storage-foundation
    provides: C4StorageService (diagram_storage.db), c4-storage:state-changed IPC, DiagramStateBadge, diagramStateStore
provides:
  - FileWatcherService wired to C4StorageService for timestamp reads and stale state updates
  - Stale badge pipeline end-to-end (file change → database → IPC → Zustand → DiagramStateBadge)
  - getStorageService exported from c4StorageHandlers for external access
affects: [phase-06-visual-map, any future work on diagram staleness or file watching]

# Tech tracking
tech-stack:
  added: []
  patterns: [FileWatcherService reads from diagram_storage.db (C4StorageService) not c4-cache.db (C4CacheService), stale detection emits c4-storage:state-changed IPC not diagram:stale]

key-files:
  created: []
  modified:
    - src/main/services/fileWatcherService.ts
    - src/main/services/c4/c4StorageHandlers.ts
    - src/main/main.ts

key-decisions:
  - "FileWatcherService reads updated_at from diagram_storage table via C4StorageService.getDiagram() instead of generation_timestamps table in c4-cache.db"
  - "emitStaleEvent (diagram:stale IPC) replaced by emitStateChangedEvent (c4-storage:state-changed IPC) to flow through new Zustand pipeline"
  - "registerC4StorageHandlers() must run before getStorageService() in main.ts to ensure singleton is initialized"
  - "isDiagramStale fallback to cacheService.isCacheStale() removed — startup check validates non-glob files only, chokidar handles runtime glob changes"

patterns-established:
  - "Stale detection: file change → C4StorageService.getDiagram() → compare updatedAt → updateState('stale') → emitStateChangedEvent → c4-storage:state-changed IPC → Zustand diagramStateStore → DiagramStateBadge"
  - "Storage singleton accessed via exported getStorageService() function from c4StorageHandlers"

requirements-completed: [STOR-01, STOR-02, STOR-03, STOR-04]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 05 Plan 07: Stale Badge Pipeline Fix Summary

**FileWatcherService rewired from c4-cache.db to diagram_storage.db, completing the stale badge transition pipeline so file changes trigger amber "Outdated" badge via c4-storage:state-changed IPC → Zustand store → DiagramStateBadge**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T21:15:48Z
- **Completed:** 2026-02-25T21:17:40Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Fixed the broken stale detection pipeline — FileWatcherService now reads generation timestamps from C4StorageService (diagram_storage.db) instead of C4CacheService (c4-cache.db) which receives no writes
- Replaced `emitStaleEvent` (sending old `diagram:stale` IPC) with `emitStateChangedEvent` (sending `c4-storage:state-changed` IPC) so the Zustand diagramStateStore and DiagramStateBadge actually update
- Updated main.ts initialization order so `registerC4StorageHandlers()` runs before `initializeFileWatcherService()` ensuring the storage singleton exists when the file watcher first calls it

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire FileWatcherService to C4StorageService and fix stale detection pipeline** - `d15cbb5` (fix)

**Plan metadata:** _(pending docs commit)_

## Files Created/Modified

- `src/main/services/fileWatcherService.ts` - Replaced C4CacheService dependency with C4StorageService; rewrote handleFileChange, checkStalenessOnStartup, isDiagramStale, and emitStaleEvent → emitStateChangedEvent; updated initializeFileWatcherService signature
- `src/main/services/c4/c4StorageHandlers.ts` - Exported getStorageService function (was module-private) so FileWatcherService can access the singleton
- `src/main/main.ts` - Added getStorageService import; reordered initialization so registerC4StorageHandlers() runs before initializeFileWatcherService(); passes getStorageService() instead of new C4CacheService()

## Decisions Made

- FileWatcherService reads `updatedAt` from `C4StorageService.getDiagram()` to get generation timestamp — this is the authoritative source since C4AnalyzerService writes to diagram_storage.db
- `isDiagramStale` fallback to `cacheService.isCacheStale()` removed — startup check only validates non-glob files; chokidar handles all glob-matched file changes at runtime
- C4CacheService import kept in main.ts because it is still used in the `cache:clearAll` IPC handler

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Stale badge pipeline is now end-to-end: file change → C4StorageService timestamp read → database state update → c4-storage:state-changed IPC → Zustand diagramStateStore → DiagramStateBadge amber "Outdated"
- UAT test #4 (stale badge transition) should now pass
- Phase 5 gap closure complete — ready for Phase 6

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 05-persistent-storage-foundation*
*Completed: 2026-02-25*
