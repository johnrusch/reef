---
phase: 10-state-transition-wiring
plan: "01"
subsystem: c4-generation
tags: [electron, ipc, zustand, sqlite, state-machine]

# Dependency graph
requires:
  - phase: 05-persistent-storage-foundation
    provides: getStorageService() singleton, updateState(), clearChangeTracking(), c4-storage:state-changed IPC broadcast
  - phase: 06-auto-generation-on-repo-add
    provides: generationQueueService with per-level generation loop

provides:
  - State transitions (generating/fresh/error) broadcast via c4-storage:state-changed IPC during background auto-generation
  - C4AnalyzerService uses shared storage singleton instead of private instance
  - Clean DiagramViewer without dead diagram:stale IPC listener

affects:
  - DiagramStateBadge (receives state-changed events during background generation)
  - diagramStateStore (Zustand store updated via existing onStateChanged subscription)
  - Add Repo -> Auto-Generate -> Badge Updates end-to-end flow

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-step state transition: updateState() + clearChangeTracking() + broadcastToAll('c4-storage:state-changed')"
    - "Pitfall 2 mitigation: updateState('generating') before first-ever generation may update zero rows — acceptable, IPC broadcast still fires"

key-files:
  created: []
  modified:
    - src/main/services/c4/generationQueueService.ts
    - src/main/services/c4/c4AnalyzerService.ts
    - src/renderer/components/DiagramViewer/DiagramViewer.tsx

key-decisions:
  - "State transitions replicate three-step logic from c4StorageHandlers (updateState + clearChangeTracking + broadcastToAll) — Pitfall 5 compliance"
  - "updateState('generating') before first-ever generation may update zero rows (Pitfall 2) — acceptable, broadcast still fires and renderer updates"
  - "C4AnalyzerService.close() is now a no-op: singleton lifecycle managed by cleanupC4Storage() at app shutdown"
  - "Dead diagram:stale listener removed; isStale local state and fileWatcher.checkStaleness usage remain intact"

patterns-established:
  - "Main process state transitions: always updateState + clearChangeTracking + broadcast as atomic triple"

requirements-completed:
  - STOR-04
  - AGEN-04
  - AGEN-05

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 10 Plan 01: State Transition Wiring Summary

**State transitions (generating/fresh/error) wired into generationQueueService per-level loop via IPC broadcasts, C4AnalyzerService switched to getStorageService() singleton, and dead diagram:stale listener removed from DiagramViewer**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-28T23:37:14Z
- **Completed:** 2026-02-28T23:38:37Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- generationQueueService emits 'generating' state + IPC broadcast before each C4 level starts, and 'fresh' state + broadcast after each level completes
- generationQueueService emits 'error' state + broadcast with error message on generation failure
- C4AnalyzerService now uses shared `getStorageService()` singleton for all storage reads/writes — enables consistent IPC state notifications through the shared pipeline
- Removed dead `diagram:stale` useEffect block from DiagramViewer (the channel was replaced by `c4-storage:state-changed` in Phase 5; the listener was never receiving events)
- All changes verified with `npx tsc --noEmit` — zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire state transitions and switch C4AnalyzerService to singleton** - `eca475b` (feat)
2. **Task 2: Remove dead diagram:stale IPC listener from DiagramViewer** - `f99d80b` (feat)

## Files Created/Modified

- `src/main/services/c4/generationQueueService.ts` - Added three-step state transitions (updateState + clearChangeTracking + broadcast) before/after each level in generation loop
- `src/main/services/c4/c4AnalyzerService.ts` - Replaced private `C4StorageService` instance with `getStorageService()` singleton; `close()` made a no-op
- `src/renderer/components/DiagramViewer/DiagramViewer.tsx` - Removed dead `diagram:stale` useEffect block (lines 356-371)

## Decisions Made

- State transitions replicate the three-step logic from c4StorageHandlers (updateState + clearChangeTracking + broadcastToAll) rather than calling the c4-storage:update-state IPC handler from within the main process — consistent with Pitfall 5 guidance
- updateState('generating') before first-ever generation may UPDATE zero rows (no diagram_storage row exists yet). Accepted: IPC broadcast still fires and renderer's Zustand store transitions to 'generating'. The 'fresh' call fires after storeDiagram() creates the row so that call is safe (Pitfall 2)
- C4AnalyzerService.close() is now a no-op: calling .close() on the shared singleton would close the shared SQLite connection and break all subsequent storage operations — singleton lifecycle is managed by cleanupC4Storage() at app shutdown
- isStale local state, setIsStale, fileWatcher.checkStaleness, StalenessBadge, and handleRegenerateFromBadge all remain intact — only the dead IPC listener useEffect was removed (Pitfall 4 compliance)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three integration gaps (audit Issues 1-3, Flow 3) are closed
- The Add Repo -> Auto-Generate -> Badge Updates flow is now end-to-end: background generation emits 'generating' and 'fresh' transitions via IPC, picked up by the existing c4-storage:state-changed subscription in DiagramViewer (lines 304-327), which updates diagramStateStore, which DiagramStateBadge reads
- No known blockers

## Self-Check: PASSED

- FOUND: src/main/services/c4/generationQueueService.ts
- FOUND: src/main/services/c4/c4AnalyzerService.ts
- FOUND: src/renderer/components/DiagramViewer/DiagramViewer.tsx
- FOUND: .planning/phases/10-state-transition-wiring/10-01-SUMMARY.md
- FOUND commit: eca475b (feat: wire state transitions and switch C4AnalyzerService to singleton)
- FOUND commit: f99d80b (feat: remove dead diagram:stale IPC listener from DiagramViewer)

---
*Phase: 10-state-transition-wiring*
*Completed: 2026-02-28*
