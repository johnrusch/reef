---
phase: 21-cache-first-navigation
plan: 01
subsystem: renderer
tags: [navigation, cache, react, zustand, tdd]
dependency_graph:
  requires: []
  provides: [loadDiagram-function, onLoadDiagram-prop, cache-first-navigation]
  affects: [VisualMapTab, DiagramViewer, navigation-handlers]
tech_stack:
  added: []
  patterns: [cache-first-load, skipLoadEffect-race-guard, useCallback-useRef]
key_files:
  created:
    - (none)
  modified:
    - src/renderer/components/tabs/VisualMapTab.tsx
    - src/renderer/components/DiagramViewer/DiagramViewer.tsx
    - tests/unit/renderer/components/tabs/VisualMapTab.test.tsx
    - tests/unit/renderer/components/DiagramViewer/NavigationDrillDown.test.tsx
decisions:
  - loadDiagram is purely read-only — never calls generate, updateState, or storeSvg
  - skipLoadEffect ref guards loadPersistedDiagram useEffect against Pitfall 5 double-load race
  - handleBreadcrumbNavigate and handleTreeNavigate never fall back to generate (already-visited levels)
  - handleElementClick and handleCommandPaletteNavigate fall back to generate on cache miss (first-time drill-down)
metrics:
  duration: ~20min
  completed: 2026-03-28
  tasks: 2
  files: 4
---

# Phase 21 Plan 01: Cache-First Navigation Summary

Refactored all navigation handlers to use a dedicated cache-first `loadDiagram` function, fixing the core NAV-01/NAV-02 bug where every breadcrumb click, sidebar click, and element drill-down unconditionally triggered AI regeneration.

## What Was Built

### Task 1: loadDiagram function + onLoadDiagram prop (TDD)

Added `loadDiagram` useCallback to `VisualMapTab.tsx` — a purely read-only cache-first load function:
- Tries SVG cache first (`window.reef.c4Storage.getSvg` — LRU then SQLite)
- Falls back to PlantUML source (`window.reef.c4Storage.getDiagram`)
- Returns `true` on cache hit, `false` on cache miss
- **Never** calls `window.reef.diagram.generate`, `updateState`, or `storeSvg`

Added `skipLoadEffect` ref with guard in `loadPersistedDiagram` useEffect to prevent Pitfall 5 (double-load race condition when navigation sets state before useEffect fires).

Added `onLoadDiagram` prop to `DiagramViewerProps` and destructured it in the component.

Passed `onLoadDiagram={loadDiagram}` from `VisualMapTab` to `DiagramViewer`.

### Task 2: Navigation handler refactor

Refactored 4 navigation handlers in `DiagramViewer.tsx`:

| Handler | Before | After |
|---------|--------|-------|
| `handleBreadcrumbNavigate` | `onRegenerateDiagram(...)` always | `onLoadDiagram(...)` only (no fallback) |
| `handleTreeNavigate` | `onRegenerateDiagram(...)` always | `onLoadDiagram(...)` only (no fallback) |
| `handleElementClick` | `onRegenerateDiagram(...)` always | `onLoadDiagram(...)` first, fallback to generate on cache miss |
| `handleCommandPaletteNavigate` | `onRegenerateDiagram(...)` always | `onLoadDiagram(...)` first, fallback to generate on cache miss |

Breadcrumb and sidebar never fall back to generate — they can only navigate to already-visited levels (which must be cached). Element click and command palette fall back to generate only on true cache miss (first-time drill-down).

## Tests

Added 7 new NAV-01/NAV-02 tests to `VisualMapTab.test.tsx`:
- `loadDiagram returns true when getSvg returns cached SVG`
- `loadDiagram falls back to getDiagram when getSvg returns null`
- `loadDiagram returns false on cache miss`
- `loadDiagram NEVER calls window.reef.diagram.generate`
- `loadDiagram NEVER calls window.reef.c4Storage.updateState`
- `loadDiagram NEVER calls window.reef.c4Storage.storeSvg`
- `VisualMapTab passes onLoadDiagram prop to DiagramViewer`

Added 4 new NAV-01 tests to `NavigationDrillDown.test.tsx`:
- `handleBreadcrumbNavigate calls onLoadDiagram, NOT onRegenerateDiagram on cache hit`
- `handleTreeNavigate calls onLoadDiagram, NOT onRegenerateDiagram`
- `handleCommandPaletteNavigate calls onLoadDiagram before onRegenerateDiagram (cache hit — no generate)`
- `handleCommandPaletteNavigate falls back to onRegenerateDiagram when onLoadDiagram returns false (cache miss)`

All 24 tests pass (10 VisualMapTab + 14 NavigationDrillDown).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all wired correctly.

## Pre-existing Test Failures (Out of Scope)

The following tests were failing BEFORE this plan's changes and remain out of scope:
- `tests/unit/renderer/components/DiagramViewer/DiagramViewer.uicl.test.tsx` — C4HierarchyTree crashes on empty stack in mock
- `tests/unit/renderer/components/tabs/VisualMapTab.gen01.test.tsx` — timeout waiting for 4-level generation (GEN-01 partial, documented in STATE.md)

These failures were verified pre-existing via `git stash` check.

## Commits

- `d1f93f4` feat(21-01): add loadDiagram function and onLoadDiagram prop
- `fdd8e51` feat(21-01): refactor navigation handlers to use onLoadDiagram

## Self-Check: PASSED

Files confirmed:
- `src/renderer/components/tabs/VisualMapTab.tsx` — contains `const loadDiagram = useCallback(async (options: {`, `skipLoadEffect = useRef(false)`, `skipLoadEffect.current`, `onLoadDiagram={loadDiagram}`
- `src/renderer/components/DiagramViewer/DiagramViewer.tsx` — contains `onLoadDiagram?:` in DiagramViewerProps, `onLoadDiagram` in all 4 navigation handlers
- `tests/unit/renderer/components/tabs/VisualMapTab.test.tsx` — 10 tests passing
- `tests/unit/renderer/components/DiagramViewer/NavigationDrillDown.test.tsx` — 14 tests passing
