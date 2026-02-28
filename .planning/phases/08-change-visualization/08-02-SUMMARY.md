---
phase: 08-change-visualization
plan: 02
subsystem: ui
tags: [react, typescript, portal, tooltip, amber, zustand, change-visualization]

# Dependency graph
requires:
  - phase: 08-01
    provides: changedFiles store field, setChangedFiles/getChangedFiles selectors, directChangedIds/inheritedChangedIds in DiagramPanel
provides:
  - ChangeBadge component with amber badge and fixed-position tooltip portal
  - DiagramPanel renders ChangeBadge below DiagramStateBadge when state is stale
  - DiagramViewer reads changedFilePaths from store and computes direct/inherited counts
  - VISU-02 and VISU-03 test coverage (7 tests)
affects: [08-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ReactDOM.createPortal for tooltip escape from overflow-hidden containers
    - Conditional portal rendering (portal DOM absent before hover) for testability
    - Fixed-position tooltip computed via getBoundingClientRect on hover

key-files:
  created:
    - src/renderer/components/DiagramViewer/ChangeBadge.tsx
    - tests/unit/renderer/components/DiagramViewer/ChangeBadge.test.tsx
  modified:
    - src/renderer/components/DiagramViewer/DiagramPanel.tsx
    - src/renderer/components/DiagramViewer/DiagramViewer.tsx

key-decisions:
  - "Conditionally render portal only when showTooltip===true — tooltip DOM absent before hover (required for test 7 / VISU-03)"
  - "Fixed-position tooltip via getBoundingClientRect escapes DiagramPanel overflow-hidden without Radix Tooltip dependency"
  - "ChangeBadge only renders in DiagramPanel when diagramState === 'stale' — prevents clutter on fresh/generating/error states"
  - "directCount/inheritedCount derived from directChangedIds.length/inheritedChangedIds.length — avoids duplicate filter logic"

patterns-established:
  - "Portal pattern: use ReactDOM.createPortal + position:fixed for tooltips inside overflow-hidden panels"
  - "Conditional portal: render portal element only when needed, never render hidden portal"

requirements-completed: [VISU-02, VISU-03]

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 8 Plan 02: Change Visualization - ChangeBadge Component Summary

**ChangeBadge with amber count badge and fixed-position portal tooltip listing changed file names, wired into DiagramPanel stale state header**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T22:08:56Z
- **Completed:** 2026-02-28T22:10:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created ChangeBadge component showing directCount/inheritedCount in amber styling matching DiagramStateBadge stale palette
- Tooltip uses ReactDOM.createPortal to escape DiagramPanel's overflow-hidden container, positioned fixed via getBoundingClientRect
- Portal is conditionally rendered only when showTooltip is true — tooltip DOM is completely absent before hover (required for test 7)
- Wired ChangeBadge into DiagramPanel flex-col badge area, appearing below DiagramStateBadge only when state is stale
- DiagramViewer reads changedFilePaths from diagramStateStore via getChangedFiles selector and passes to DiagramPanel
- Full data flow connected: IPC onStateChanged -> setChangedFiles -> getChangedFiles -> changedFilePaths prop -> ChangeBadge tooltip
- All 7 VISU-02/VISU-03 tests pass; 40 total tests pass across 3 test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ChangeBadge component with file-list tooltip** - `9ce4732` (feat)
2. **Task 2: Wire ChangeBadge into DiagramPanel and pass data from DiagramViewer** - `481b4ca` (feat)

**Plan metadata:** (pending final metadata commit)

## Files Created/Modified
- `src/renderer/components/DiagramViewer/ChangeBadge.tsx` - New component: amber badge with count display and portal tooltip listing changed file basenames
- `tests/unit/renderer/components/DiagramViewer/ChangeBadge.test.tsx` - 7 tests covering VISU-02 (count display) and VISU-03 (tooltip behavior)
- `src/renderer/components/DiagramViewer/DiagramPanel.tsx` - Added ChangeBadge import + 3 new props (directCount, inheritedCount, changedFilePaths); wrapped badges in flex-col; ChangeBadge renders when stale
- `src/renderer/components/DiagramViewer/DiagramViewer.tsx` - Added changedFilePaths store subscription + directCount/inheritedCount derivation; passed 3 new props to DiagramPanel

## Decisions Made
- Conditionally render portal only when showTooltip is true — tooltip DOM absent before hover, required for VISU-03 test case 7
- Fixed-position tooltip computed via getBoundingClientRect — escapes overflow-hidden without adding Radix Tooltip dependency
- ChangeBadge renders only when diagramState === 'stale' — avoids clutter on fresh/generating/error states, and ChangeBadge itself returns null when both counts are zero
- directCount/inheritedCount derived from directChangedIds.length/inheritedChangedIds.length — avoids re-filtering affectedElements

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ChangeBadge is complete and wired up through the full data pipeline
- Phase 8 Plan 3 can build on the change visualization foundation (both SVG highlighting from 08-01 and ChangeBadge from 08-02 are ready)
- No blockers

## Self-Check: PASSED

- FOUND: src/renderer/components/DiagramViewer/ChangeBadge.tsx
- FOUND: tests/unit/renderer/components/DiagramViewer/ChangeBadge.test.tsx
- FOUND: commit 9ce4732 (Task 1)
- FOUND: commit 481b4ca (Task 2)

---
*Phase: 08-change-visualization*
*Completed: 2026-02-28*
