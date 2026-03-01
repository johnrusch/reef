---
phase: 09-diagram-to-diff-navigation
plan: 02
subsystem: ui
tags: [zustand, react, navigation, diff-viewer, diagram]

# Dependency graph
requires:
  - phase: 09-01
    provides: diagramNavigationStore with intent/clearIntent, restoreStack on navigationStore, DiagramViewer code-level click intercept

provides:
  - CommitWorkflowTab consumes DiagramNavigationIntent and auto-opens target file diff
  - EnhancedChangesPanel highlights navigated-from-diagram file with amber ring/background
  - DiffViewer shows blue "Navigated from Visual Map" context banner with back button
  - handleBackToDiagram restores prior navigation stack and switches to visualmap tab

affects: [diagram-to-diff-navigation, visual-map, commit-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns: [useEffect intent consumption with stale guard, useCallback with .getState() pattern for cross-store navigation]

key-files:
  created: []
  modified:
    - src/renderer/components/repository/EnhancedChangesPanel.tsx
    - src/renderer/components/repository/DiffViewer.tsx
    - src/renderer/components/tabs/CommitWorkflowTab.tsx

key-decisions:
  - "Intent consumption useEffect has 5-second stale guard to prevent stale intents from mis-navigating on re-mount"
  - "highlightedFile set synchronously before handleViewDiff for immediate visual feedback in changes panel"
  - "handleBackToDiagram uses .getState() pattern (consistent with Phase 06-03 and 07-02 decisions)"
  - "Manual file selection clears diagramReturn and highlightedFile — banner disappears on intentional user navigation"
  - "void handleViewDiff() fire-and-forget in useEffect consistent with Phase 06-03 pattern"

patterns-established:
  - "Diagram-to-diff round-trip: intent set before tab switch (09-01), consumed in useEffect with stale guard (09-02), back button restores stack"
  - "Cross-component navigation state: diagramReturn captured before clearIntent() to avoid race condition"

requirements-completed: [NAVG-02, NAVG-03, NAVG-04, NAVG-05]

# Metrics
duration: ~5min
completed: 2026-02-28
---

# Phase 9 Plan 02: Diagram-to-Diff Navigation (Consume Side) Summary

**CommitWorkflowTab consumes DiagramNavigationIntent to auto-open diffs with amber file highlight, blue context banner, and back-to-diagram button completing the round-trip navigation flow**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-28T23:14:00Z
- **Completed:** 2026-02-28T23:19:22Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- CommitWorkflowTab subscribes to `diagramNavigationStore` intent and auto-opens diff for target file on arrival
- EnhancedChangesPanel highlights the navigated-from file with amber `ring-1 ring-amber-500/50 bg-amber-500/10` styling and auto-scrolls via `useRef`
- DiffViewer shows blue "Navigated from Visual Map" banner (with Map icon and ArrowLeft back button) when `fromDiagram=true`
- Back button calls `restoreStack()` then `setActiveTab('visualmap')` completing the round-trip
- Manual file selection in changes panel clears diagram navigation state (highlight and banner disappear)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add EnhancedChangesPanel file highlighting and DiffViewer context banner** - `1a97414` (feat)
2. **Task 2: Wire CommitWorkflowTab to consume navigation intent and pass props downstream** - `187bdff` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `src/renderer/components/repository/EnhancedChangesPanel.tsx` - Added `highlightedFile` prop with amber ring highlight, `useRef` auto-scroll
- `src/renderer/components/repository/DiffViewer.tsx` - Added `fromDiagram`/`onBackToDiagram` props, blue context banner with Map icon and ArrowLeft back button
- `src/renderer/components/tabs/CommitWorkflowTab.tsx` - Imports diagramNavigationStore, navigationStore, repositoryStore; adds `highlightedFile`/`diagramReturn` state; intent consumption useEffect with 5-second stale guard; `handleBackToDiagram` callback; wires new props to both child components

## Decisions Made
- 5-second stale guard on intent consumption prevents stale intents from triggering navigation on re-mount or delayed tab activation
- `diagramReturn` captured synchronously before `clearIntent()` to avoid race condition where intent could be null when read in callback (Pitfall 1 from research)
- `handleViewDiff` receives `void` prefix in useEffect (fire-and-forget) consistent with Phase 06-03 pattern
- `handleBackToDiagram` uses `.getState()` inside `useCallback` to avoid re-subscription exhaustive-deps issues (consistent with Phase 06-03 and 07-02)
- `highlightedFile ?? undefined` converts `string | null` to `string | undefined` to match optional prop type

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 9 is now complete — both plans (09-01 and 09-02) implemented and committed
- Full diagram-to-diff round-trip navigation flow is wired end-to-end:
  1. User clicks changed element in DiagramViewer (code level) → intent set → commit tab activated
  2. CommitWorkflowTab consumes intent → auto-opens diff → highlights file → shows context banner
  3. User clicks "Back to diagram" → navigation stack restored → visual map tab reactivated
- Requirements NAVG-01 through NAVG-05 are all satisfied across plans 09-01 and 09-02

---
*Phase: 09-diagram-to-diff-navigation*
*Completed: 2026-02-28*
