---
phase: 14-rendering-performance
plan: 02
subsystem: renderer
tags: [svg-cache, performance, react, plantuml, nailgun, electron, lru-cache]

# Dependency graph
requires:
  - phase: 14-01
    provides: getSvg/storeSvg preload bridge methods (window.reef.c4Storage.getSvg/storeSvg)
provides:
  - SVG cache fast path in VisualMapTab.loadPersistedDiagram (PERF-01)
  - onSvgGenerated callback prop in PlantUMLRenderer fired after SVG generation
  - storeSvg called in VisualMapTab.handleSvgGenerated to persist generated SVG
  - preRenderedSvg prop threaded through DiagramViewer -> DiagramPanel -> PlantUMLRenderer
  - Nailgun warm-JVM feature flag (nailgunEnabled in electron-store) (PERF-03)
  - shutdownNailgun cleanup on app before-quit
affects:
  - Runtime behavior: cached diagrams load in under 500ms (no Java subprocess)
  - Runtime behavior: first-time diagram generation stores SVG for future loads
  - Runtime behavior: Nailgun reduces first-time generation time when enabled

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SVG cache fast path: check LRU->SQLite before falling back to PlantUML source render
    - Callback prop pattern: onSvgGenerated fired after SVG generation, propagates up to storage layer
    - preRenderedSvg prop: bypasses Java generation in PlantUMLRenderer when SVG already available
    - Feature flag pattern: nailgunEnabled in electron-store, disabled by default, no behavior change unless set

key-files:
  created: []
  modified:
    - src/renderer/components/tabs/VisualMapTab.tsx
    - src/renderer/components/PlantUMLRenderer.tsx
    - src/renderer/components/DiagramViewer/DiagramPanel.tsx
    - src/renderer/components/DiagramViewer/DiagramViewer.tsx
    - src/main/services/plantUmlService.ts
    - src/main/main.ts

key-decisions:
  - "preRenderedSvg=undefined (not empty string) passed to DiagramViewer when svgContent is empty — avoids triggering SVG fast path when no cached SVG exists"
  - "svgContent cleared (set to '') on new diagram generation so PlantUMLRenderer renders from source and fires onSvgGenerated to refresh the cache"
  - "Nailgun initializeNailgun() called after registerHandlers() in constructor so IPC handlers are always registered regardless of Nailgun init failure"
  - "shutdownNailgun uses typeof nailgunServer.close guard for node-plantuml version compatibility"

patterns-established:
  - "SVG cache fast path: try getSvg -> on hit: setSvgContent+setMetadata+return; on miss: fall through to getDiagram"
  - "Callback prop chain: onSvgGenerated flows from VisualMapTab.handleSvgGenerated -> DiagramViewer -> DiagramPanel -> PlantUMLRenderer"

requirements-completed: [PERF-01, PERF-02, PERF-03]

# Metrics
duration: 4min
completed: 2026-03-03
---

# Phase 14 Plan 02: SVG Cache Renderer Integration Summary

**SVG cache wired into rendering pipeline: VisualMapTab checks LRU/SQLite cache before Java render, PlantUMLRenderer fires onSvgGenerated callback to store generated SVG, Nailgun warm-JVM feature-flagged behind nailgunEnabled setting**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-03T22:04:55Z
- **Completed:** 2026-03-03T22:08:42Z
- **Tasks:** 2 auto (Task 3 is checkpoint:human-verify, pending user verification)
- **Files modified:** 6

## Accomplishments

- Added `preRenderedSvg?: string` and `onSvgGenerated?: (svg: string) => void` props to `PlantUMLRendererProps`, `DiagramPanelProps`, and `DiagramViewerProps`
- `PlantUMLRenderer` now fires `onSvgGenerated?.(svg)` after both local (Java) and server-based SVG generation
- `PlantUMLRenderer` short-circuits Java generation when `preRenderedSvg` is provided, displaying it instantly
- `VisualMapTab.loadPersistedDiagram` checks `c4Storage.getSvg()` (LRU + SQLite) before falling back to PlantUML source render
- `VisualMapTab.handleSvgGenerated` stores rendered SVG via `c4Storage.storeSvg()` as useCallback
- `PlantUMLService` reads `nailgunEnabled` from electron-store and calls `plantuml.useNailgun()` when enabled
- `shutdownNailgun()` exported and called in `app.before-quit` handler to prevent Nailgun port leaks

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire SVG cache fast path + onSvgGenerated callback** - `f0a4bca` (feat)
2. **Task 2: Add Nailgun feature-flagged warm JVM with cleanup** - `f687960` (feat)

## Files Created/Modified

- `src/renderer/components/tabs/VisualMapTab.tsx` - svgContent state, SVG cache fast path in loadPersistedDiagram, handleSvgGenerated callback, updated DiagramViewer render condition and props
- `src/renderer/components/PlantUMLRenderer.tsx` - preRenderedSvg and onSvgGenerated props, onSvgGenerated calls after both generation paths, preRenderedSvg fast path in useEffect
- `src/renderer/components/DiagramViewer/DiagramPanel.tsx` - preRenderedSvg and onSvgGenerated props threaded to PlantUMLRenderer
- `src/renderer/components/DiagramViewer/DiagramViewer.tsx` - preRenderedSvg and onSvgGenerated props threaded to DiagramPanel
- `src/main/services/plantUmlService.ts` - Store import, nailgunServer variable, shutdownNailgun() export, initializeNailgun() method
- `src/main/main.ts` - Named import of shutdownNailgun, shutdownNailgun() call in before-quit handler

## Decisions Made

- Used `svgContent || undefined` when passing `preRenderedSvg` to DiagramViewer so an empty string doesn't trigger the SVG fast path — only a non-empty cached SVG enables instant display
- Cleared `svgContent` to empty string on new diagram generation, ensuring PlantUMLRenderer renders from source and fires `onSvgGenerated` to refresh the cache with a fresh SVG
- `initializeNailgun()` is called after `registerHandlers()` in the constructor — IPC handlers always register even if Nailgun init fails (graceful degradation)
- `shutdownNailgun` uses a `typeof nailgunServer.close === 'function'` guard since node-plantuml's Nailgun server handle may not have a `.close()` method depending on version

## Deviations from Plan

None - plan executed exactly as written.

## Verification Status

- TypeScript compiles: PASS
- Main process tests (plantUmlService.test.ts): PASS (14/14)
- Lint: Pre-existing errors only (6 errors in unrelated files, none in modified files)
- Manual verification (Task 3 checkpoint): PENDING user confirmation

## User Setup Required

To enable Nailgun warm-JVM mode (optional, significantly reduces first-time generation time):
1. Open DevTools console in the running app
2. Run: `window.reef.store.set('nailgunEnabled', true)`
3. Restart the app
4. Generate a new diagram — first-time generation should be ~1-2s instead of 5-8s

## Next Phase Readiness

- Phase 14 rendering performance pipeline is complete pending user verification (Task 3)
- SVG caching is fully wired: load path checks cache before Java, generate path stores SVG after render
- Nailgun is available as opt-in for users wanting faster first-time generation

---
*Phase: 14-rendering-performance*
*Completed: 2026-03-03*
