---
phase: 09-diagram-to-diff-navigation
plan: 01
subsystem: ui
tags: [zustand, react, diagram, navigation, cross-tab]

# Dependency graph
requires:
  - phase: 08-change-visualization
    provides: directChangedIds/inheritedChangedIds/changedFilePaths in DiagramViewer context
  - phase: 03-hierarchy-navigation
    provides: navigationStore with stack-based navigation and NavigationLevel type
provides:
  - diagramNavigationStore Zustand store with setIntent/clearIntent actions
  - DiagramNavigationIntent and DiagramNavigationReturn exported types
  - restoreStack action on navigationStore for back-navigation
  - handleNavigateToDiff in DiagramViewer that sets cross-tab intent and switches to commit tab
affects: [09-02-PLAN.md, CommitWorkflowTab, any future back-navigation consumer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ephemeral Zustand store (no persist) for cross-tab one-shot navigation intent"
    - ".getState() pattern for action calls inside useCallback to avoid re-subscriptions"
    - "setIntent BEFORE setActiveTab ordering to prevent race condition at tab switch"

key-files:
  created:
    - src/renderer/stores/diagramNavigationStore.ts
  modified:
    - src/renderer/stores/navigationStore.ts
    - src/renderer/components/DiagramViewer/DiagramViewer.tsx

key-decisions:
  - "No persist middleware on diagramNavigationStore — intent consumed once, must not survive restart (consistent with toastStore)"
  - "createdAt timestamp in intent enables stale intent detection in consumer (5-second threshold guard)"
  - "DiagramNavigationReturn type exported separately for CommitWorkflowTab local state (Plan 02)"
  - "setIntent called BEFORE setActiveTab to prevent race condition where consumer reads empty intent"
  - "handleNavigateToDiff uses .getState() pattern consistent with Phase 06-03 and 07-02 decisions"
  - "Code-level click navigates to changedFilePaths[0] (first changed file) — reasonable default per research Option A"

patterns-established:
  - "Ephemeral intent store pattern: create store without persist, set intent with snapshot + timestamp, consumer clears after use"
  - "Cross-tab navigation: setIntent → setActiveTab sequence guarantees consumer receives populated intent"

requirements-completed: [NAVG-01, NAVG-02]

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 9 Plan 01: Diagram Navigation Store and DiagramViewer Click Intercept Summary

**Ephemeral Zustand intent store and DiagramViewer code-level click intercept that snapshots return position and switches to commit tab when a changed element is clicked**

## Performance

- **Duration:** 2 min (81s)
- **Started:** 2026-02-28T23:13:18Z
- **Completed:** 2026-02-28T23:14:39Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `diagramNavigationStore.ts` as ephemeral Zustand store with setIntent/clearIntent and typed DiagramNavigationIntent (targetFile, returnStack, returnLevel, createdAt)
- Added `restoreStack` action to `navigationStore.ts` enabling back-navigation by replacing stack from snapshot
- Wired DiagramViewer `handleElementClick` code-level branch to detect changed elements and call `handleNavigateToDiff`, which sets intent before switching to commit tab

## Task Commits

Each task was committed atomically:

1. **Task 1: Create diagramNavigationStore and add restoreStack** - `c0234eb` (feat)
2. **Task 2: Wire DiagramViewer code-level click to emit navigation intent** - `e51ab4a` (feat)

## Files Created/Modified
- `src/renderer/stores/diagramNavigationStore.ts` - New ephemeral Zustand store for cross-tab navigation intent with typed exports
- `src/renderer/stores/navigationStore.ts` - Added restoreStack action to interface and implementation
- `src/renderer/components/DiagramViewer/DiagramViewer.tsx` - Added imports, handleNavigateToDiff callback, modified code-level click branch

## Decisions Made
- No persist middleware on diagramNavigationStore — intent is consumed once and must not survive app restart (consistent with toastStore pattern)
- createdAt timestamp in intent enables stale intent detection in Plan 02 consumer (5-second threshold)
- DiagramNavigationReturn type exported separately for CommitWorkflowTab local state use in Plan 02
- setIntent called BEFORE setActiveTab to prevent race condition (Pitfall 3 from research)
- handleNavigateToDiff uses `.getState()` pattern (consistent with Phase 06-03 and 07-02 decisions) to avoid re-subscriptions
- Code-level click defaults to changedFilePaths[0] — first changed file is reasonable default per research Option A

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - TypeScript compiled cleanly on first attempt for both tasks.

## NAVG-01 Verification
Confirmed stale indicator (NAVG-01) already implemented: `handleRegenerateFromBadge` wired to `onRegenerateFromBadge` prop on DiagramPanel and `onClick` on StalenessBadge. No code changes needed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Intent store and DiagramViewer emit side complete — ready for Plan 02 (CommitWorkflowTab consume side)
- Plan 02 needs: read intent from useDiagramNavigationStore, auto-select file in diff viewer, render back button using restoreStack
- No blockers

## Self-Check: PASSED

- diagramNavigationStore.ts: FOUND
- navigationStore.ts: FOUND
- DiagramViewer.tsx: FOUND
- 09-01-SUMMARY.md: FOUND
- Commit c0234eb: FOUND
- Commit e51ab4a: FOUND
- TypeScript: PASS

---
*Phase: 09-diagram-to-diff-navigation*
*Completed: 2026-02-28*
