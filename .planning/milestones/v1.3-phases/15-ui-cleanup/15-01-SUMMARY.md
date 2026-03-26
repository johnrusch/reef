---
phase: 15-ui-cleanup
plan: 01
subsystem: ui
tags: [react, typescript, diagram-viewer, vitest, testing-library]

# Dependency graph
requires: []
provides:
  - DiagramControls gutted to Regenerate + Force Regenerate + confirm dialog only (UICL-02)
  - DiagramViewer with no DiagramInfo sidebar (UICL-03)
  - RepositoryTabs with no Beta badge on Visual Map tab (UICL-04)
  - VisualMapTab with no settings configuration landing page (UICL-01)
  - Wave 0 TDD tests for all four UICL requirements
affects: [16-diagram-explorer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD Wave 0: write tests targeting absences first, then make code changes to satisfy them

key-files:
  created:
    - tests/unit/renderer/components/DiagramViewer/DiagramControls.test.tsx
    - tests/unit/renderer/components/DiagramViewer/DiagramViewer.uicl.test.tsx
    - tests/unit/renderer/components/repository/RepositoryTabs.test.tsx
    - tests/unit/renderer/components/tabs/VisualMapTab.test.tsx
  modified:
    - src/renderer/components/repository/RepositoryTabs.tsx
    - src/renderer/components/DiagramViewer/DiagramControls.tsx
    - src/renderer/components/DiagramViewer/DiagramViewer.tsx
    - src/renderer/components/tabs/VisualMapTab.tsx

key-decisions:
  - "Removed entire settings landing page from VisualMapTab — replaced with GeneratePromptCard fallback for unmatched state"
  - "DiagramControls interface simplified to 3 props: isGenerating, onRegenerate, onForceRegenerate"
  - "VisualMapTab viewMode type narrowed from 3-way union to single 'diagram' value — tree mode only accessible from deleted settings page"
  - "Kept diagramType/detailLevel/focusArea/modelType/elementId state vars — still needed by generateDiagram function"

patterns-established:
  - "UICL pattern: test for absence of removed UI text using queryByText(...) not toBeInTheDocument() before making code changes (TDD RED)"

requirements-completed: [UICL-01, UICL-02, UICL-03, UICL-04]

# Metrics
duration: 30min
completed: 2026-03-04
---

# Phase 15 Plan 01: UI Cleanup Summary

**Removed legacy configuration UI from diagram view — gutted DiagramControls to buttons only, removed DiagramInfo sidebar, eliminated settings landing page and Beta badge, with 12 TDD tests validating all four UICL requirements**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-04T23:06:05Z
- **Completed:** 2026-03-04T23:20:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- TDD Wave 0: created 4 test files with 12 tests targeting absence of removed UI elements (RED before code changes)
- Removed 610 lines across 4 source files — entire settings landing page, legacy toolbar props, DiagramInfo sidebar, Beta badge
- All 12 UICL tests now pass GREEN; TypeScript compiles clean with zero errors
- No regressions: all existing renderer component tests continue to pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Write Wave 0 tests for all four UICL requirements** - `33e6f4a` (test)
2. **Task 2: Execute all four UI removals across 5 source files** - `bf1bad1` (feat)

**Plan metadata:** (docs: complete plan — see final commit)

## Files Created/Modified

- `tests/unit/renderer/components/repository/RepositoryTabs.test.tsx` - UICL-04 tests: no Beta badge, all 3 tab labels present
- `tests/unit/renderer/components/DiagramViewer/DiagramControls.test.tsx` - UICL-02 tests: no legacy labels, Regenerate buttons present, confirm dialog works
- `tests/unit/renderer/components/DiagramViewer/DiagramViewer.uicl.test.tsx` - UICL-03 test: no "Diagram Information" heading rendered
- `tests/unit/renderer/components/tabs/VisualMapTab.test.tsx` - UICL-01 tests: no "Diagram Settings", "AI Model", or "Traditional File Tree" text
- `src/renderer/components/repository/RepositoryTabs.tsx` - Removed beta field from Tab interface and Beta badge JSX
- `src/renderer/components/DiagramViewer/DiagramControls.tsx` - Gutted to minimal props + Regenerate buttons + confirm dialog
- `src/renderer/components/DiagramViewer/DiagramViewer.tsx` - Removed DiagramInfo import/render, cleaned up DiagramControls prop call
- `src/renderer/components/tabs/VisualMapTab.tsx` - Deleted settings landing page (~380 lines), removed 3 unused state vars and 2 useEffects

## Decisions Made

- Removed entire settings landing page from VisualMapTab — replaced with GeneratePromptCard fallback for unmatched state
- DiagramControls interface simplified to 3 props: isGenerating, onRegenerate, onForceRegenerate
- VisualMapTab viewMode type narrowed from `'settings' | 'diagram' | 'tree'` to just `'diagram'` — tree mode was only accessible from deleted settings page
- Kept `diagramType`, `detailLevel`, `focusArea`, `modelType`, `elementId` state vars — still feed the `generateDiagram()` function

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing: better-sqlite3 native module version mismatch (NODE_MODULE_VERSION 139 vs 127) causes main-process storage/migration tests to fail. Not related to this plan — documented in STATE.md as known blocker.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Canvas is cleared for Phase 16 Diagram Explorer UI
- DiagramViewer entry point (`VisualMapTab`) now routes cleanly: API key modal → DiagramViewer (with diagram) → GeneratePromptCard (never generated) → generating spinner → GeneratePromptCard fallback
- DiagramControls minimal interface is ready to receive new explorer controls in Phase 16
- No blockers for Phase 16

---
*Phase: 15-ui-cleanup*
*Completed: 2026-03-04*
