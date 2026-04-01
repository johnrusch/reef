---
phase: 21-cache-first-navigation
plan: 02
subsystem: main+renderer
tags: [generate-all, c4-levels, elementId-discovery, ui-copy, tdd]
dependency_graph:
  requires: [21-01]
  provides: [generate-all-4-levels, extractElementIds, Generate-All-button, ui-copy-spec]
  affects: [generationQueueService, VisualMapTab, DiagramControls, GeneratePromptCard, DiagramViewer]
tech_stack:
  added: []
  patterns: [two-phase-generation, elementId-discovery-from-plantuml, queue-event-subscription]
key_files:
  created:
    - tests/unit/main/generationQueueService.test.ts
  modified:
    - src/main/services/c4/generationQueueService.ts
    - src/renderer/components/tabs/VisualMapTab.tsx
    - src/renderer/components/DiagramViewer/DiagramControls.tsx
    - src/renderer/components/DiagramViewer/GeneratePromptCard.tsx
    - src/renderer/components/DiagramViewer/DiagramViewer.tsx
    - tests/unit/renderer/components/DiagramViewer/DiagramControls.test.tsx
    - tests/unit/renderer/components/tabs/VisualMapTab.gen01.test.tsx
    - tests/unit/renderer/components/tabs/VisualMapTab.test.tsx
decisions:
  - extractElementIds parses PlantUML Container/Component macros using regex to discover element IDs for next-level generation
  - generationQueueService uses two-phase approach: context+container first (fatal on error), then component+code per discovered element (non-fatal)
  - Queue event useEffect placed after loadDiagram useCallback definition to avoid temporal dead zone error
  - VisualMapTab.generateAllDiagrams now delegates entirely to c4Generation.enqueue — no more manual 2-level loop
  - showGenerateAll computed in VisualMapTab and passed down to DiagramControls via DiagramViewer
metrics:
  duration: ~25min
  completed: 2026-03-29
  tasks: 2
  files: 8
---

# Phase 21 Plan 02: Fix Generate All — 4 C4 Levels with elementId Discovery

Fixed "Generate All" to produce all 4 C4 levels (context, container, component, code) by implementing elementId auto-discovery in the generation queue service, wiring the renderer to use the queue service, and updating UI copy per the design contract.

## What Was Built

### Task 1: extractElementIds + generationQueueService two-phase generation (TDD)

Added `extractElementIds` as an exported helper in `generationQueueService.ts`:
- Parses PlantUML source for `Container(id, ...)`, `ContainerDb(id, ...)`, `ContainerQueue(id, ...)`, `Container_Ext(id, ...)`, `Container_Boundary(id, ...)` to discover container IDs
- Parses `Component(id, ...)`, `ComponentDb(id, ...)`, `ComponentQueue(id, ...)`, `Component_Ext(id, ...)` to discover component IDs
- Returns unique IDs in order found; returns empty array for non-applicable levels (context, code)

Refactored `c4-generation:enqueue` handler from a flat 4-level loop to a two-phase approach:

**Phase 1 — context + container (fatal on error):**
- Same as before: generate context, emit state events, then generate container
- Context/container errors abort the entire generation (preserve existing contract)

**Phase 2 — component + code per discovered element (non-fatal):**
- After container succeeds, call `getStorageService().getDiagram(repoPath, 'container')` to retrieve stored PlantUML
- Call `extractElementIds(containerDiagram.diagramContent, 'container')` to get container IDs
- For each containerId: generate `component:containerId`, then query component diagram and extract component IDs
- For each componentId: generate `code:componentId`
- Component/code failures are caught with `console.error` and do not abort — other levels continue

Updated progress broadcasts to show accurate percentages (25%/50% for context/container, 75-100% for component/code).

### Task 2: Renderer wiring + UI copy

**VisualMapTab.tsx:**
- Replaced manual 2-level `for (const { type, level } of levels)` loop in `generateAllDiagrams` with a single `window.reef.c4Generation.enqueue(repository.path, repository.name)` call
- Added `showGenerateAll` useMemo: true when context or container state is `never_generated`
- Added `useEffect` for generation queue events (placed after `loadDiagram` useCallback to avoid temporal dead zone):
  - `onProgress` keeps `isGenerating` true while generation runs
  - `onComplete` clears `isGenerating`, shows success/error toast, reloads states, calls `loadDiagram({ type: 'c4-context' })`
- Passes `showGenerateAll` and `onGenerateAll={generateAllDiagrams}` to DiagramViewer

**DiagramViewer.tsx:**
- Added `showGenerateAll?: boolean` and `onGenerateAll?: () => void` to `DiagramViewerProps`
- Passes both props through to DiagramControls

**DiagramControls.tsx:**
- Added `showGenerateAll?: boolean` and `onGenerateAll?: () => void` to props interface
- Added Generate All button (with Sparkles icon) to the left of Regenerate button — only shown when `showGenerateAll && onGenerateAll`
- Updated confirm dialog cancel button text: "Keep Current Diagram" (was "Cancel")
- Updated confirm dialog confirm button text: "Regenerate Diagram" (was "Regenerate")
- Updated non-stale dialog body to match UI spec: "...using the AI API, overwriting the stored version."

**GeneratePromptCard.tsx:**
- Description: "All 4 levels will be generated so drill-down navigation is instant."
- Button label: "Generate All" (was "Generate Diagrams")
- Footnote: "Requires an Anthropic API key. Generation may take 30-60 seconds."

## Tests

### New tests (9) — generationQueueService.test.ts:
- `extracts Container element IDs from a container diagram`
- `extracts ContainerQueue and Container_Ext IDs`
- `extracts ContainerBoundary IDs`
- `extracts Component element IDs from a component diagram`
- `returns empty array for context level (not applicable)`
- `returns empty array for code level (not applicable)`
- `returns empty array for empty diagram`
- `returns empty array when no matching elements found`
- `handles multiple occurrences of same ID gracefully`

### Updated tests — DiagramControls.test.tsx (+7):
- `confirm dialog shows "Keep Current Diagram" cancel button`
- `confirm dialog shows "Regenerate Diagram" confirm button`
- `does NOT render Generate All button when showGenerateAll is false`
- `renders Generate All button when showGenerateAll is true`
- `clicking Generate All calls onGenerateAll`
- `Generate All button shows Generating... when isGenerating is true`

### Updated tests — VisualMapTab.gen01.test.tsx (rewritten):
Old tests validated legacy 4-call `diagram.generate` loop. Rewritten to validate:
- `GeneratePromptCard button is rendered`
- `clicking generate button calls c4Generation.enqueue (GEN-01: all 4 levels via queue)`
- `generate button does NOT call diagram.generate directly (delegates to queue)`

All 37 plan-related tests pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Temporal dead zone: generation queue useEffect referenced loadDiagram before initialization**
- **Found during:** Task 2 implementation
- **Issue:** Plan placed the generation queue `useEffect` before `loadDiagram` useCallback definition, causing "Cannot access 'loadDiagram' before initialization" runtime error
- **Fix:** Moved generation queue `useEffect` to after `loadDiagram` is defined (after line 294)
- **Files modified:** `src/renderer/components/tabs/VisualMapTab.tsx`
- **Commit:** d2d405c

**2. [Rule 1 - Bug] VisualMapTab.gen01.test.tsx tested deprecated behavior**
- **Found during:** Task 2 verification
- **Issue:** gen01 tests validated old `diagram.generate` loop and `c4Generation` mock was missing, causing crashes
- **Fix:** Updated gen01 tests to validate new `c4Generation.enqueue` delegation pattern; added `c4Generation` to mock in both gen01 and VisualMapTab.test.tsx
- **Files modified:** `tests/unit/renderer/components/tabs/VisualMapTab.gen01.test.tsx`, `tests/unit/renderer/components/tabs/VisualMapTab.test.tsx`
- **Commit:** d2d405c

## Known Stubs

None — all functionality is wired correctly.

## Pre-existing Test Failures (Out of Scope)

The following test files fail due to pre-existing environment/mock issues:
- `tests/unit/main/services/GitService.test.ts`
- `tests/unit/main/services/migrationService.test.ts`
- `tests/unit/main/services/fileWatcherService.test.ts`
- `tests/unit/renderer/components/Button.test.tsx`

Verified pre-existing via `git stash` check before implementation.

## Commits

- `94b83d5` feat(21-02): fix generationQueueService elementId discovery for all 4 C4 levels
- `d2d405c` feat(21-02): wire Generate All to queue service, add Generate All button, update UI copy

## Self-Check: PASSED
