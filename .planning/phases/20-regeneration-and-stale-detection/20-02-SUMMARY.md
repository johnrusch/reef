---
phase: 20-regeneration-and-stale-detection
plan: 02
subsystem: ui
tags: [react, zustand, diagramStateStore, staleness, toast, regeneration]

# Dependency graph
requires:
  - phase: 20-regeneration-and-stale-detection
    provides: Plan 01 ReefStalenessService writing 'stale' state to diagramStateStore via IPC
  - phase: 18-write-path
    provides: Phase 18 write-through auto-saves SVG to .reef/ on storeSvg
provides:
  - Stale-aware regeneration that only regenerates levels with state === 'stale' (D-08)
  - Confirmation dialog showing stale level count to inform user of API cost (D-06)
  - DiagramViewer isStale derived from diagramStateStore (not local useState)
  - Toast notifications on regeneration completion and partial failure (D-12, D-14)
  - staleLevelCount prop wired through DiagramViewer -> DiagramControls
affects: [21-diagram-explorer, any phase touching VisualMapTab regeneration flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - isStale derived from Zustand store getState() instead of local useState — ensures badge reflects hash-based detection
    - regenerateStaleLevels function separates stale-only regeneration from first-time generateAllDiagrams
    - toastStore.addToast used for success/failure user feedback in VisualMapTab

key-files:
  created: []
  modified:
    - src/renderer/components/DiagramViewer/DiagramControls.tsx
    - src/renderer/components/DiagramViewer/DiagramViewer.tsx
    - src/renderer/components/tabs/VisualMapTab.tsx

key-decisions:
  - "isStale in DiagramViewer derived from useDiagramStateStore().getState() === 'stale' — staleness driven by Plan 01's ReefStalenessService via IPC, not local file watcher calls"
  - "regenerateStaleLevels added as dedicated function; generateAllDiagrams delegates to it when staleLevels.length > 0 (D-08 compliance)"
  - "Removed setIsStale calls from handleRegenerateFromBadge — store transitions handle state automatically on IPC events"
  - "useToastStore.addToast used for completion feedback (D-12) instead of console.log — consistent with project toast pattern"
  - "No stale indicator added to toolbar Regenerate button (D-09 preserved)"

patterns-established:
  - "Store-derived isStale: always read diagram state from diagramStateStore, never maintain parallel local state"
  - "Stale-first regeneration: check staleLevels before running full generation; skip fresh levels silently"

requirements-completed: [REGEN-01]

# Metrics
duration: 15min
completed: 2026-03-27
---

# Phase 20 Plan 02: Stale-Aware Regeneration Flow Summary

**DiagramControls and VisualMapTab wired for hash-based stale detection with stale-only regeneration, API cost warning dialog, and toast completion feedback**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-27T00:00:00Z
- **Completed:** 2026-03-27T00:15:00Z
- **Tasks:** 1 of 2 (Task 2 is a human-verify checkpoint, awaiting verification)
- **Files modified:** 3

## Accomplishments
- DiagramViewer `isStale` now derived from `useDiagramStateStore.getState() === 'stale'` — StalenessBadge reflects hash-based staleness from Plan 01's `ReefStalenessService`
- `staleLevelCount` prop flows from VisualMapTab → DiagramViewer → DiagramControls, enabling the confirmation dialog to show "N diagrams outdated" (D-06)
- `regenerateStaleLevels()` in VisualMapTab only loops over levels with state `stale`, skipping fresh ones (D-08)
- `generateAllDiagrams()` delegates to `regenerateStaleLevels()` when stale levels exist
- Toast notifications wired via `useToastStore.addToast` for both success (D-12) and partial failure (D-14)
- No stale indicator added to toolbar Regenerate button (D-09 preserved)
- TypeScript compiles with zero errors

## Task Commits

1. **Task 1: Add stale level count to DiagramControls, wire isStale to diagramStateStore, add stale-aware regeneration** - `c8dacda` (feat)

## Files Created/Modified
- `src/renderer/components/DiagramViewer/DiagramControls.tsx` - Added `staleLevelCount` prop; updated confirmation dialog text to show "N diagrams outdated" when stale
- `src/renderer/components/DiagramViewer/DiagramViewer.tsx` - Added `staleLevelCount` to props; replaced `useState(false)` for `isStale` with `useMemo` reading from `diagramStateStore`; removed `setIsStale` calls; removed stale file-watcher check effect; passes `staleLevelCount` to DiagramControls
- `src/renderer/components/tabs/VisualMapTab.tsx` - Added `useMemo`, `useToastStore` imports; added `staleLevels` computed value; added `regenerateStaleLevels()` function; updated `generateAllDiagrams()` to delegate to stale-only flow; passes `staleLevelCount={staleLevels.length}` to DiagramViewer

## Decisions Made
- `isStale` in DiagramViewer is now store-derived — Plan 01's `ReefStalenessService` writes `'stale'` state via IPC which updates the store, and the badge reactively shows. No more stale file-watcher checkStaleness calls in DiagramViewer.
- `regenerateStaleLevels` is a dedicated function rather than modifying the existing `generateAllDiagrams` body — keeps first-time generation and stale regeneration flows separate and independently testable.
- `useToastStore.addToast` preferred over `console.log` since the project already has a toast infrastructure wired in `MainLayout` and `ToastContainer`.

## Deviations from Plan

None - plan executed exactly as written. Toast discovery step in plan instructions found the existing `toastStore` pattern, so `addToast` was used instead of the `console.log` fallback.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Task 1 complete and compiling. Ready for human verification (Task 2).
- Verification: Run `npm run dev`, add a repo, generate diagrams, make a code change, wait 3 seconds for the yellow "Outdated" badge to appear on diagram overlay (NOT toolbar), click badge to confirm dialog shows stale count, confirm regeneration only processes stale levels.

---
*Phase: 20-regeneration-and-stale-detection*
*Completed: 2026-03-27 (Task 1 only; Task 2 awaiting human verification)*
