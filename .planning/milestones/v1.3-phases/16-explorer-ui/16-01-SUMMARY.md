---
phase: 16-explorer-ui
plan: 01
subsystem: renderer/DiagramViewer
tags: [navigation, sidebar, toolbar, c4-hierarchy, tdd, explorer-ui]
dependency_graph:
  requires: []
  provides:
    - C4HierarchyTree sidebar component
    - DiagramControls with show/hide changes toggle
    - generateAllDiagrams for all 4 C4 levels
    - DiagramPanel conditional change highlight rendering
  affects:
    - src/renderer/components/DiagramViewer/DiagramViewer.tsx
    - src/renderer/components/tabs/VisualMapTab.tsx
tech_stack:
  added: []
  patterns:
    - TDD (RED-GREEN cycle for all new components)
    - Zustand store subscription in sidebar component
    - Sequential async generation with per-level try/catch
key_files:
  created:
    - src/renderer/components/DiagramViewer/C4HierarchyTree.tsx
    - tests/unit/renderer/components/DiagramViewer/C4HierarchyTree.test.tsx
    - tests/unit/renderer/components/tabs/VisualMapTab.gen01.test.tsx
  modified:
    - src/renderer/components/DiagramViewer/DiagramViewer.tsx
    - src/renderer/components/DiagramViewer/DiagramControls.tsx
    - src/renderer/components/DiagramViewer/DiagramPanel.tsx
    - src/renderer/components/tabs/VisualMapTab.tsx
    - src/renderer/components/DiagramViewer/GeneratePromptCard.tsx
    - tests/unit/renderer/components/DiagramViewer/DiagramControls.test.tsx
decisions:
  - C4HierarchyTree uses local useState for collapse rather than store — minimizes shared state
  - handleTreeNavigate defined after handleBreadcrumbNavigate to avoid temporal dead zone in useCallback deps
  - showChanges converted from destructured prop constant to useState in DiagramViewer for local toggle control
  - generateAllDiagrams uses for-of with per-level try/catch so partial failure does not block remaining levels
metrics:
  duration: 11min
  completed: "2026-03-05"
  tasks_completed: 2
  files_created: 3
  files_modified: 7
---

# Phase 16 Plan 01: Explorer UI — C4 Sidebar, Minimal Toolbar, All-Levels Generation Summary

C4HierarchyTree sidebar with collapsible navigation, DiagramControls replaced with two-button toolbar (Regenerate + Show/Hide Changes), generateAllDiagrams sequential 4-level generation, and DiagramPanel showChanges suppression fix.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | C4HierarchyTree sidebar + DiagramViewer integration | e16df25 | C4HierarchyTree.tsx, DiagramViewer.tsx, C4HierarchyTree.test.tsx |
| 2 | Minimal toolbar + all-levels generation + showChanges fix | ecb85b9 | DiagramControls.tsx, DiagramPanel.tsx, GeneratePromptCard.tsx, VisualMapTab.tsx, DiagramControls.test.tsx, VisualMapTab.gen01.test.tsx |

## What Was Built

### C4HierarchyTree (NAV-01, NAV-03)
New sidebar component at `src/renderer/components/DiagramViewer/C4HierarchyTree.tsx`:
- Renders all 4 C4 level buttons: System Context, Containers, Components, Code
- Subscribes to `useNavigationStore` to highlight the active level (`bg-blue-600/20 text-blue-300`)
- Collapsible via `ChevronLeft/ChevronRight` toggle — collapsed state shows `w-10` with icons only
- Uses lucide-react icons: Globe, Layers, Box, Code2 for the 4 levels
- Indentation increases by 12px per level depth
- Integrated into DiagramViewer layout as left sibling of diagram panel

### DiagramViewer Integration (NAV-01, NAV-03)
Updated `src/renderer/components/DiagramViewer/DiagramViewer.tsx`:
- Imported and rendered C4HierarchyTree with `onNavigate={handleTreeNavigate}` and `disabled={isGenerating}`
- Added `handleTreeNavigate` callback: if level in nav stack, uses `handleBreadcrumbNavigate`; otherwise resets and loads level
- Converted `showChanges` from destructured prop constant to `useState<boolean>` for toggle control
- Removed `handleForceRegenerate` callback
- Added `min-w-0` to diagram panel div to prevent layout overflow
- Updated DiagramControls usage: removed `onForceRegenerate`, added `showChanges` and `onToggleChanges` props

### DiagramControls Minimal Toolbar (GEN-02)
Replaced `src/renderer/components/DiagramViewer/DiagramControls.tsx`:
- Interface: `{ isGenerating, onRegenerate, showChanges, onToggleChanges }`
- Exactly 2 controls: Regenerate (blue-600) + Show/Hide Changes toggle (gray-600)
- Toggle shows "Show Changes" with Eye icon when `showChanges=false`, "Hide Changes" with EyeOff when `showChanges=true`
- Force Regenerate button removed entirely
- Confirm dialog preserved for Regenerate

### DiagramPanel showChanges Fix (GEN-02)
Fixed suppressed `_showChanges` parameter in `src/renderer/components/DiagramViewer/DiagramPanel.tsx`:
- Renamed `showChanges: _showChanges` to `showChanges` (removed underscore suppression)
- Updated PlantUMLRenderer to receive `directChangedIds={showChanges ? directChangedIds : []}` and `inheritedChangedIds={showChanges ? inheritedChangedIds : []}`
- Toggle now actually controls SVG highlight rendering

### generateAllDiagrams (GEN-01)
Added to `src/renderer/components/tabs/VisualMapTab.tsx`:
- Sequential generation of all 4 C4 levels: c4-context, c4-container, c4-component, c4-code
- Per-level try/catch prevents partial failure from blocking remaining levels
- Both `GeneratePromptCard` onGenerate calls updated to use `generateAllDiagrams`

### GeneratePromptCard Text Update
Updated `src/renderer/components/DiagramViewer/GeneratePromptCard.tsx`:
- Button text: "Generate C4 Diagram" → "Generate All Diagrams"
- Heading: "No C4 Diagram Yet" → "No C4 Diagrams Yet"
- Description updated to mention all 4 C4 levels

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed temporal dead zone in handleTreeNavigate**
- **Found during:** Task 1 DiagramViewer integration
- **Issue:** `handleTreeNavigate` was defined before `handleBreadcrumbNavigate` in component body, causing "Cannot access 'handleBreadcrumbNavigate' before initialization" error in React reconciler
- **Fix:** Moved `handleTreeNavigate` definition to after `handleBreadcrumbNavigate`
- **Files modified:** src/renderer/components/DiagramViewer/DiagramViewer.tsx
- **Commit:** e16df25

**2. [Rule 1 - Bug] Fixed test assertion for generate API call signature**
- **Found during:** Task 2 VisualMapTab.gen01 test
- **Issue:** Test checked `call[0]?.type` but C4 diagram generate API is called as `generate(repoPath, { type })` — type is in second argument
- **Fix:** Updated assertion to `call[1]?.type` to match actual API call signature
- **Files modified:** tests/unit/renderer/components/tabs/VisualMapTab.gen01.test.tsx
- **Commit:** ecb85b9

## Test Results

All renderer unit tests pass (14 test files, 214 tests passing). Pre-existing failures in GitService.test.ts and migrationService.test.ts (better-sqlite3 native module NODE_MODULE_VERSION 139 vs 127 mismatch — documented in STATE.md) are not related to this plan's work.

## Self-Check: PASSED

Files verified:
- `src/renderer/components/DiagramViewer/C4HierarchyTree.tsx` — FOUND
- `src/renderer/components/DiagramViewer/DiagramControls.tsx` — FOUND (modified)
- `src/renderer/components/DiagramViewer/DiagramPanel.tsx` — FOUND (modified)
- `src/renderer/components/DiagramViewer/DiagramViewer.tsx` — FOUND (modified)
- `src/renderer/components/tabs/VisualMapTab.tsx` — FOUND (modified)
- `tests/unit/renderer/components/DiagramViewer/C4HierarchyTree.test.tsx` — FOUND

Commits verified:
- e16df25 — feat(16-01): add C4HierarchyTree sidebar and integrate into DiagramViewer
- ecb85b9 — feat(16-01): minimal toolbar, all-levels generation, DiagramPanel showChanges fix
