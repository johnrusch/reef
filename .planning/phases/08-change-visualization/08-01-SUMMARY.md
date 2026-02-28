---
phase: 08-change-visualization
plan: 01
subsystem: ui
tags: [svg, zustand, react, typescript, change-visualization, plantuml, dom-manipulation]

# Dependency graph
requires:
  - phase: 07-enhanced-change-detection
    provides: AffectedElement interface, affectedElements Map in diagramStateStore, StateChangedPayload.changedFiles field
  - phase: 05-persistent-storage-foundation
    provides: DiagramStateStore, diagramStateStore Zustand store pattern
provides:
  - SVG DOM post-processing for change highlighting in PlantUMLRenderer (data-changed attributes, amber CSS)
  - changedFiles Map in diagramStateStore with setChangedFiles/getChangedFiles accessors
  - applyChangeHighlighting() exported utility function for testable SVG DOM manipulation
  - directChangedIds/inheritedChangedIds computed from affectedElements in DiagramViewer
  - DiagramPanel prop threading for highlight IDs through to PlantUMLRenderer
affects:
  - 08-02 (tooltip overlay for changed elements needs changedFiles store data)
  - plan-08-03 (ChangeBadge overlay if planned)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SVG DOM post-processing via useEffect after dangerouslySetInnerHTML renders
    - Exported pure function (applyChangeHighlighting) for testable DOM manipulation logic
    - data-changed attribute pattern for CSS-driven SVG element highlighting
    - Injected <style data-reef-changes> inside SVG for !important override of inline presentation attributes

key-files:
  created:
    - tests/unit/renderer/components/DiagramViewer/PlantUMLRenderer.changeHighlight.test.tsx
  modified:
    - src/renderer/stores/diagramStateStore.ts
    - src/renderer/components/PlantUMLRenderer.tsx
    - src/renderer/components/DiagramViewer/DiagramViewer.tsx
    - src/renderer/components/DiagramViewer/DiagramPanel.tsx

key-decisions:
  - "Export applyChangeHighlighting() as standalone utility from PlantUMLRenderer — enables direct unit testing without mocking async SVG generation pipeline"
  - "Inject <style data-reef-changes> block inside SVG element (not wrapper div) — SVG <style> overrides inline presentation attributes; !important added for cross-browser safety"
  - "Use data-changed='direct'/'inherited' attributes on elem_ groups — CSS-driven styling, no inline style manipulation"
  - "changedFiles cleared on transitionToFresh and transitionToGenerating — consistent with affectedElements clearing pattern"
  - "Legacy regex highlightChangesInDiagram removed from DiagramPanel — never worked for C4 SVG diagrams, replaced by SVG DOM post-processing"
  - "Keep changedFiles and showChanges in DiagramPanel interface but rename destructured to _changedFiles/_showChanges — preserve callers, suppress unused variable TS errors"

patterns-established:
  - "SVG DOM post-processing: querySelector('.diagram-wrapper') from containerRef.current, then inject <style> into SVG"
  - "Store Map extensions: follow affectedElements pattern exactly (generateKey, set/get/clear, cleared in transitions)"
  - "Testable DOM logic: export pure function accepting Element, test against jsdom SVG nodes directly"

requirements-completed: [VISU-01, VISU-04]

# Metrics
duration: 4min
completed: 2026-02-28
---

# Phase 08 Plan 01: Change Visualization SVG Highlighting Summary

**SVG DOM change highlighting with amber fill for direct changes (VISU-01) and dashed amber border for inherited changes (VISU-04), backed by changedFiles Map in diagramStateStore**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-28T22:02:46Z
- **Completed:** 2026-02-28T22:06:18Z
- **Tasks:** 2
- **Files modified:** 4 (plus 1 test file created)

## Accomplishments
- Extended diagramStateStore with changedFiles Map (setChangedFiles/getChangedFiles), cleared on fresh/generating transitions and clearStatesForRepo
- Added directChangedIds/inheritedChangedIds props to PlantUMLRenderer with useEffect SVG post-processing
- Exported applyChangeHighlighting() as pure testable function that sets data-changed attributes and injects amber CSS <style> into SVG
- Wired DiagramViewer to store changedFiles from IPC events and cold-launch persistence, computed directChangedIds/inheritedChangedIds from affectedElements
- Threaded highlight IDs from DiagramViewer through DiagramPanel to PlantUMLRenderer
- Removed legacy regex-based highlightChangesInDiagram from DiagramPanel (never worked for C4 SVG diagrams)
- 33 tests passing: 21 diagramStateStore tests (18 existing + 3 new changedFiles) + 12 VISU-01/VISU-04 tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend diagramStateStore with changedFiles and add SVG highlight props to PlantUMLRenderer** - `9a030ef` (feat)
2. **Task 2: Wire DiagramViewer to pass changedFiles to store and highlight IDs to PlantUMLRenderer via DiagramPanel** - `04f30ae` (feat)

## Files Created/Modified
- `src/renderer/stores/diagramStateStore.ts` - Added changedFiles Map with setChangedFiles/getChangedFiles, clear on transitions
- `src/renderer/components/PlantUMLRenderer.tsx` - Added directChangedIds/inheritedChangedIds props, exported applyChangeHighlighting(), useEffect for SVG DOM post-processing
- `src/renderer/components/DiagramViewer/DiagramViewer.tsx` - changedFiles stored from IPC and cold-launch, directChangedIds/inheritedChangedIds computed, passed to DiagramPanel
- `src/renderer/components/DiagramViewer/DiagramPanel.tsx` - Threaded directChangedIds/inheritedChangedIds to PlantUMLRenderer, removed legacy regex highlighting and legend
- `tests/unit/renderer/stores/diagramStateStore.test.ts` - 3 new changedFiles tests added
- `tests/unit/renderer/components/DiagramViewer/PlantUMLRenderer.changeHighlight.test.tsx` - 12 VISU-01/VISU-04 tests for applyChangeHighlighting()

## Decisions Made
- Exported `applyChangeHighlighting()` as standalone testable function rather than testing through full PlantUMLRenderer async pipeline (avoids complex plantuml-encoder and window.reef.plantuml mocking)
- Used `<style data-reef-changes>` injection inside SVG rather than inline style manipulation — `data-changed` CSS attribute selectors override inline SVG presentation attributes with `!important` for cross-browser safety
- Kept `changedFiles` and `showChanges` in DiagramPanel interface but prefixed destructured names with underscore (`_changedFiles`, `_showChanges`) to suppress TypeScript unused variable errors while preserving calling code compatibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript `noUnusedLocals` flagged `changedFiles` and `showChanges` in DiagramPanel destructuring after removing the legacy legend section. Resolved by prefixing with underscore (`_changedFiles`, `_showChanges`) to preserve interface stability while suppressing the TS error.

## Next Phase Readiness
- SVG change highlighting infrastructure is complete: data-changed attributes + injected CSS
- changedFiles Map in store ready for Plan 02 tooltip display
- applyChangeHighlighting() utility available for reuse
- Pre-existing Button.test.tsx failure (missing @renderer/components/Button file) is out of scope; all other tests pass

---
*Phase: 08-change-visualization*
*Completed: 2026-02-28*
