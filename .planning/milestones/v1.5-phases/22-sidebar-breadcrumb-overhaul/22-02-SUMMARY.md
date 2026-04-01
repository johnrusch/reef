---
phase: 22-sidebar-breadcrumb-overhaul
plan: 02
subsystem: renderer/DiagramViewer, main/c4Storage
tags: [sidebar, element-tree, ipc, drill-down, navigation, ui]
dependency_graph:
  requires: [22-01]
  provides: [sidebar-element-tree, c4-get-elements-ipc]
  affects: [C4HierarchyTree, DiagramViewer, c4StorageHandlers, preload]
tech_stack:
  added: []
  patterns: [IPC handler with .reef/ file read, useEffect element loading with three states (loading/empty/error), prop-passed repoPath pattern]
key_files:
  created: []
  modified:
    - src/main/services/c4/c4StorageHandlers.ts
    - src/main/preload.ts
    - src/renderer/components/DiagramViewer/C4HierarchyTree.tsx
    - src/renderer/components/DiagramViewer/DiagramViewer.tsx
decisions:
  - "repoPath passed as prop to C4HierarchyTree rather than reading from useRepositoryStore — DiagramViewer already has _repository?.path and repositoryStore has no selectedRepository selector"
  - "handleElementClick moved before handleTreeNavigate in DiagramViewer to resolve forward reference TypeScript error"
  - "Plan 01 code commits cherry-picked into worktree (worktree-agent-a005be3f was on pre-plan-01 state after rebase)"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-03-30"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 4
requirements: [SIDE-03]
---

# Phase 22 Plan 02: Sidebar Element Tree Summary

IPC handler `c4-storage:get-elements` reads element IDs from `.reef/` PlantUML files via extractElementIds, and C4HierarchyTree renders a nested clickable element tree under the active C4 level with loading/empty/error states.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add IPC handler for element list extraction and preload bridge | 9bea2ce | c4StorageHandlers.ts, preload.ts |
| 2 | Add element tree UI to C4HierarchyTree sidebar | 377b2ec | C4HierarchyTree.tsx, DiagramViewer.tsx |

## What Was Built

### Task 1 — IPC handler + preload bridge (SIDE-03 backend)

**c4StorageHandlers.ts:**
- Added imports: `readFile` from `fs/promises`, `join` from `path`, `extractElementIds` from `./generationQueueService`, `REEF_DIR` from `../reef/reefStorageTypes`
- Added `ipcMain.handle('c4-storage:get-elements', ...)` handler inside `registerC4StorageHandlers`
- Handler reads `.reef/{level}.puml` for flat levels (context/container) and `.reef/{level}/{parentId}/diagram.puml` for nested levels
- Calls `extractElementIds(pumlContent, extractLevel)` where extractLevel maps context→container and container→component
- Returns `Array<{id: string, name: string}>` where name is the humanized element ID
- Returns `[]` gracefully on ENOENT; logs and returns `[]` on other errors (non-fatal for UI)

**preload.ts:**
- Added `getElements: (repoPath: string, level: string, elementId?: string) => Promise<Array<{id: string, name: string}>>` to `ReefAPI` interface
- Added implementation: `ipcRenderer.invoke('c4-storage:get-elements', repoPath, level, elementId)`

### Task 2 — Element tree UI (SIDE-03 frontend)

**C4HierarchyTree.tsx:**
- Added `Loader2` to lucide-react imports
- Added `repoPath?: string` prop
- Added state: `elements`, `isLoadingElements`, `elementLoadError`
- `useEffect` loads elements via `window.reef.c4Storage.getElements(repoPath, activeLevel, elementId)` when `activeLevel`, `repoPath`, `isCollapsed`, or `stack` changes
- Only loads for context/container levels (those that have drillable children)
- Changed level list `.map()` to use `React.Fragment key={level}` wrapper to support sibling element tree
- Element tree renders under the active level row with progressive indentation (`12 + (index + 1) * 12`px)
- Three states: loading (Loader2 spinner), error ("Could not load elements"), empty ("No elements cached")
- Element buttons call `onNavigate(level, el.id)` on click

**DiagramViewer.tsx:**
- Moved `handleElementClick` before `handleTreeNavigate` to resolve TypeScript forward-reference error
- Updated `handleTreeNavigate` signature to accept `elementId?: string`
- Added D-10 check: `if (elementId) { await handleElementClick(elementId); return; }`
- Added `handleElementClick` to `handleTreeNavigate` dependency array
- Passed `repoPath={_repository?.path}` to both `C4HierarchyTree` instances

## Acceptance Criteria Verification

- c4StorageHandlers.ts contains `ipcMain.handle('c4-storage:get-elements'` — PASS
- c4StorageHandlers.ts contains `import { extractElementIds } from './generationQueueService'` — PASS
- c4StorageHandlers.ts contains `REEF_DIR` import from reef storage types — PASS
- c4StorageHandlers.ts handler reads from `.reef/{level}.puml` for flat levels — PASS
- c4StorageHandlers.ts handler catches ENOENT and returns empty array — PASS
- preload.ts contains `getElements: (repoPath: string, level: string, elementId?: string)` — PASS
- preload.ts contains `ipcRenderer.invoke('c4-storage:get-elements'` — PASS
- C4HierarchyTree.tsx contains `window.reef.c4Storage.getElements(` — PASS
- C4HierarchyTree.tsx contains `useState<Array<{id: string, name: string}>>` — PASS
- C4HierarchyTree.tsx contains `No elements cached` — PASS
- C4HierarchyTree.tsx contains `Could not load elements` — PASS
- C4HierarchyTree.tsx contains `Loader2` import and `animate-spin` class — PASS
- C4HierarchyTree.tsx element buttons call `onNavigate(level, el.id)` — PASS
- C4HierarchyTree.tsx element items have `text-gray-400 hover:text-gray-200 hover:bg-gray-700` — PASS
- DiagramViewer.tsx `handleTreeNavigate` checks `if (elementId)` and delegates to `handleElementClick` — PASS
- TypeScript compiles without errors (only pre-existing unused var in generationQueueService.ts) — PASS
- `npm run build:renderer` completes successfully — PASS
- `npm run build:main` shows only pre-existing C4_LEVELS unused var error — PASS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree branch was based on pre-Plan-01 state**
- **Found during:** Task 2 start
- **Issue:** `worktree-agent-a005be3f` branch contained Phase 16 commits; Plan 01 code commits (74ef0c1, 06c3c2d) were on separate worktree `worktree-agent-a1bd1abf` and not merged to main
- **Fix:** Rebased worktree on main (for STATE.md/SUMMARY.md updates), then cherry-picked 74ef0c1 and 06c3c2d to bring Plan 01 source changes into this worktree
- **Files modified:** DiagramViewer.tsx, C4HierarchyTree.tsx, DiagramBreadcrumbs.tsx (Plan 01 changes)

**2. [Rule 2 - Missing prop] Plan specified useRepositoryStore but selector doesn't exist**
- **Found during:** Task 2 implementation
- **Issue:** Plan said `useRepositoryStore(s => s.selectedRepository)` but the store only has `selectedRepositories` (array of IDs with no path). DiagramViewer already has `_repository?.path`
- **Fix:** Added `repoPath?: string` prop to C4HierarchyTree and passed `_repository?.path` from DiagramViewer — cleaner and avoids duplicate store lookup
- **Files modified:** C4HierarchyTree.tsx, DiagramViewer.tsx

**3. [Rule 1 - Bug] TypeScript forward reference error on handleElementClick**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `handleTreeNavigate` referenced `handleElementClick` but was defined before it, causing TS2448/TS2454 errors
- **Fix:** Moved `handleElementClick` definition before `handleTreeNavigate` in DiagramViewer.tsx
- **Files modified:** DiagramViewer.tsx

## Known Stubs

None — all IPC and UI wires to live data (.reef/ files via extractElementIds).

## Self-Check: PASSED

Files verified:
- `src/main/services/c4/c4StorageHandlers.ts` — EXISTS
- `src/main/preload.ts` — EXISTS
- `src/renderer/components/DiagramViewer/C4HierarchyTree.tsx` — EXISTS
- `src/renderer/components/DiagramViewer/DiagramViewer.tsx` — EXISTS

Commits verified:
- `9bea2ce` — EXISTS (feat(22-02): add c4-storage:get-elements IPC handler and preload bridge)
- `377b2ec` — EXISTS (feat(22-02): add element tree UI to C4HierarchyTree sidebar)
