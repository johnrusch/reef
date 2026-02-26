---
phase: 07-enhanced-change-detection
plan: 02
subsystem: ipc
tags: [electron, ipc, file-watcher, zustand, change-tracking, c4-model, react]

# Dependency graph
requires:
  - phase: 07-01
    provides: ChangeTrackingService, sanitizeId, AffectedElement types, diagram_change_tracking SQLite table, upsertChangeTracking/getChangeTracking/clearChangeTracking on C4StorageService

provides:
  - FileWatcherService wired to ChangeTrackingService: delegates handleFileChange to recordChange() instead of direct IPC emission
  - main.ts lifecycle wiring: ChangeTrackingService init before FileWatcherService, shutdown on before-quit
  - c4-storage:get-change-tracking IPC handler: returns persisted AffectedElement data from SQLite
  - c4-storage:clear-change-tracking IPC handler: clears tracking data by repo+level
  - c4-storage:update-state auto-clears change tracking on fresh/generating transitions
  - preload.ts getChangeTracking and clearChangeTracking bridge to renderer
  - diagramStateStore affectedElements Map with setAffectedElements, getAffectedElements, getChangedElementCount, clearAffectedElements
  - DiagramViewer handles enriched state-changed payload and stores affected elements
  - DiagramViewer loads persisted change tracking on mount (cold launch recovery)

affects:
  - 07-03: Phase 7 Plan 03 (UI visualization) reads affectedElements from store to highlight stale elements
  - 08: Phase 8 change visualization reads affectedElements from IPC to highlight SVG elements

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Backwards-compatible optional injection: FileWatcherService accepts optional ChangeTrackingService, falls back to direct emission"
    - "useDiagramStateStore.getState() in useEffect callbacks avoids re-subscription from exhaustive-deps"
    - "Lifecycle symmetry: initialize ChangeTrackingService before FileWatcherService, shutdown ChangeTrackingService before cleanupC4Storage"

key-files:
  created: []
  modified:
    - src/main/services/fileWatcherService.ts
    - src/main/main.ts
    - src/main/services/c4/c4StorageHandlers.ts
    - src/main/preload.ts
    - src/renderer/stores/diagramStateStore.ts
    - src/renderer/components/DiagramViewer/DiagramViewer.tsx
    - tests/unit/renderer/stores/diagramStateStore.test.ts

key-decisions:
  - "FileWatcherService accepts optional ChangeTrackingService — preserves backwards compatibility with existing tests that construct without it"
  - "c4-storage:update-state auto-clears change tracking on fresh/generating — single source of truth for clearing without requiring renderer to call clearChangeTracking separately"
  - "DiagramViewer uses useDiagramStateStore.getState() in onStateChanged callback — consistent with Phase 06-03 decision, avoids re-subscriptions"
  - "DiagramViewer loads all 4 C4 levels on repo change — minimal overhead, ensures cold-launch persisted tracking is hydrated for any level"

patterns-established:
  - "Backwards-compatible injection: optional service parameter in constructor, fallback to existing behavior when absent"
  - "Store getState() in event callbacks: call useDiagramStateStore.getState() inside IPC callbacks instead of destructuring from hook"

requirements-completed: [CHNG-01, CHNG-05]

# Metrics
duration: 8min
completed: 2026-02-26
---

# Phase 7 Plan 02: Enhanced Change Detection — Pipeline Wiring Summary

**End-to-end file-change pipeline wired: FileWatcherService delegates to ChangeTrackingService, enriched IPC flows to diagramStateStore affectedElements Map, with IPC handlers and cold-launch recovery**

## Performance

- **Duration:** 8 min (513s)
- **Started:** 2026-02-26T20:47:59Z
- **Completed:** 2026-02-26T20:56:32Z
- **Tasks:** 3 completed
- **Files modified:** 7

## Accomplishments

- FileWatcherService now delegates file changes to ChangeTrackingService.recordChange() for debounced, enriched processing instead of direct IPC emission
- ChangeTrackingService initialized before FileWatcherService in main.ts and properly shut down on before-quit to prevent timer leaks
- Two new IPC handlers expose get/clear change tracking data, with auto-clear on fresh/generating state transitions
- diagramStateStore extended with affectedElements Map, supporting setAffectedElements, getAffectedElements, getChangedElementCount, clearAffectedElements
- transitionToFresh and transitionToGenerating automatically clear affected elements; clearStatesForRepo clears both states and affected elements
- DiagramViewer handles enriched state-changed payloads and loads persisted change tracking on cold launch
- 6 new CHNG-05 store unit tests covering all affected element behaviors; all pass alongside existing 12 store tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire ChangeTrackingService into FileWatcherService and main.ts lifecycle** - `782e647` (feat)
2. **Task 2: Add IPC handler and preload bridge for getChangeTracking** - `530d72b` (feat)
3. **Task 3: Extend diagramStateStore and wire DiagramViewer** - `769fb47` (feat)

## Files Created/Modified

- `src/main/services/fileWatcherService.ts` - Added ChangeTrackingService injection, delegation in handleFileChange, optional param in initializeFileWatcherService
- `src/main/main.ts` - Imports ChangeTrackingService, creates instance, passes to initializeFileWatcherService, shuts down on before-quit
- `src/main/services/c4/c4StorageHandlers.ts` - c4-storage:get-change-tracking and c4-storage:clear-change-tracking handlers; auto-clear on fresh/generating
- `src/main/preload.ts` - getChangeTracking and clearChangeTracking exposed in ReefAPI interface and implementation
- `src/renderer/stores/diagramStateStore.ts` - affectedElements Map, setAffectedElements, getAffectedElements, getChangedElementCount, clearAffectedElements; transitionToFresh/Generating and clearStatesForRepo updated
- `src/renderer/components/DiagramViewer/DiagramViewer.tsx` - onStateChanged handles affectedElements in payload; new useEffect loads persisted change tracking on repo change
- `tests/unit/renderer/stores/diagramStateStore.test.ts` - 6 new CHNG-05 tests for affected elements store extension

## Decisions Made

- Used backwards-compatible optional injection for ChangeTrackingService in FileWatcherService — preserves all existing tests that construct FileWatcherService without the new parameter
- Auto-clear change tracking in c4-storage:update-state handler on fresh/generating — avoids requiring the renderer to call clearChangeTracking separately, single location for clearing
- Used useDiagramStateStore.getState() inside DiagramViewer IPC callback — consistent with Phase 06-03 pattern, avoids re-subscriptions from exhaustive-deps
- DiagramViewer loads all 4 C4 levels on repo change for cold launch — minimal overhead (4 SQLite reads), ensures any level has its persisted tracking hydrated

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all 3 tasks compiled with zero TypeScript errors on first attempt, all 6 new tests passed.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Full pipeline now wired: file save → ChangeTrackingService → debounce → enriched IPC → diagramStateStore
- affectedElements Map available for Phase 8 to read and highlight SVG elements
- getChangedElementCount available for badge/indicator display at each C4 level
- Cold-launch recovery implemented: persisted change tracking loaded on DiagramViewer mount
- All 18 diagramStateStore tests green, zero TypeScript errors

## Self-Check: PASSED

- FOUND: src/main/services/fileWatcherService.ts
- FOUND: src/main/main.ts
- FOUND: src/main/services/c4/c4StorageHandlers.ts
- FOUND: src/main/preload.ts
- FOUND: src/renderer/stores/diagramStateStore.ts
- FOUND: src/renderer/components/DiagramViewer/DiagramViewer.tsx
- FOUND: tests/unit/renderer/stores/diagramStateStore.test.ts
- FOUND: .planning/phases/07-enhanced-change-detection/07-02-SUMMARY.md
- COMMIT 782e647: feat(07-02): wire ChangeTrackingService into FileWatcherService and main.ts lifecycle
- COMMIT 530d72b: feat(07-02): add IPC handlers and preload bridge for getChangeTracking
- COMMIT 769fb47: feat(07-02): extend diagramStateStore with affected elements and wire DiagramViewer

---
*Phase: 07-enhanced-change-detection*
*Completed: 2026-02-26*
