---
phase: 05-persistent-storage-foundation
plan: 06
subsystem: ui
tags: [react, zustand, typescript, electron, c4-diagrams]

# Dependency graph
requires:
  - phase: 05-persistent-storage-foundation/05-05
    provides: State transitions in generation pipeline, VisualMapTab wired to storage
provides:
  - GeneratePromptCard reachable from default settings render path for never_generated repos
  - First-time generating indicator (DiagramStateBadge) shown before DiagramViewer exists
  - onStateChanged subscription in VisualMapTab for pre-DiagramViewer state sync
affects: [visual-map-ui, c4-diagram-generation-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "State-aware conditional rendering: check currentState before falling through to default view"
    - "Dual subscription pattern: both DiagramViewer and VisualMapTab subscribe to onStateChanged for full coverage"

key-files:
  created: []
  modified:
    - src/renderer/components/tabs/VisualMapTab.tsx

key-decisions:
  - "GeneratePromptCard moved to settings-mode render path - checks currentState==='never_generated' rather than viewMode==='diagram'"
  - "Standalone generating indicator uses DiagramStateBadge directly (not inside DiagramViewer) for first-time generation before any diagram exists"
  - "VisualMapTab subscribes to onStateChanged independently from DiagramViewer to handle pre-mount state transitions"

patterns-established:
  - "Unreachable blocks guarded by impossible state combinations should be moved to the always-reachable default render path"

requirements-completed: [STOR-01, STOR-02, STOR-03, STOR-04]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 5 Plan 06: UI Rendering Gap Closure Summary

**VisualMapTab now shows GeneratePromptCard for never-generated repos and a DiagramStateBadge generating indicator during first-time generation — both previously unreachable due to impossible viewMode guards.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T20:28:43Z
- **Completed:** 2026-02-25T20:30:46Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Removed unreachable `viewMode === 'diagram' && !diagram` block (viewMode never becomes 'diagram' without a stored diagram)
- GeneratePromptCard now renders from the default settings-mode path when `currentState === 'never_generated' && !diagram`
- First-time generating indicator (DiagramStateBadge + message) renders when `currentState === 'generating' && !diagram`
- Added `onStateChanged` subscription in VisualMapTab so Zustand store updates before DiagramViewer ever mounts

## Task Commits

1. **Task 1: Move GeneratePromptCard to settings-mode render path and add first-time generating indicator** - `5093c10` (feat)

**Plan metadata:** (pending)

## Files Created/Modified

- `src/renderer/components/tabs/VisualMapTab.tsx` - Fixed both rendering gaps: removed unreachable block, added state-aware conditional renders, added DiagramStateBadge import and setState from store, added onStateChanged subscription

## Decisions Made

- GeneratePromptCard check uses `currentState === 'never_generated' && !diagram` rather than a viewMode guard — this is always reachable because viewMode stays 'settings' when no stored diagram exists
- Standalone `DiagramStateBadge state="generating"` used for first-time generation UI (same component used inside DiagramViewer for consistency)
- Settings panel remains as fallback for edge cases (error with no diagram, states not yet loaded)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 (Persistent Storage Foundation) is now fully complete — all six plans executed
- Storage pipeline is fully wired end-to-end with correct UI state rendering
- Ready for Phase 6

---
*Phase: 05-persistent-storage-foundation*
*Completed: 2026-02-25*

## Self-Check: PASSED

- FOUND: src/renderer/components/tabs/VisualMapTab.tsx
- FOUND commit: 5093c10 (feat(05-06): fix unreachable UI rendering paths in VisualMapTab)
