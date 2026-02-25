---
phase: 05-persistent-storage-foundation
plan: 05
subsystem: storage-wiring
tags: [storage, state-management, c4-analyzer, diagram-viewer, ipc]
dependency_graph:
  requires: [05-01, 05-02, 05-03, 05-04]
  provides: [complete-storage-pipeline, state-transitions, persistent-diagram-display]
  affects: [c4AnalyzerService, VisualMapTab, DiagramViewer]
tech_stack:
  added: []
  patterns: [singleton-storage, ipc-state-sync, optimistic-ui-update]
key_files:
  created: []
  modified:
    - src/main/services/c4/c4AnalyzerService.ts
    - src/renderer/components/tabs/VisualMapTab.tsx
    - src/renderer/components/DiagramViewer/DiagramViewer.tsx
decisions:
  - "C4AnalyzerService creates its own C4StorageService instance (not the IPC singleton) - WAL mode handles concurrent access from both instances"
  - "State transitions in generateDiagram() are best-effort (wrapped in try/catch) - generation continues even if state update fails"
  - "DiagramViewer.handleRegenerate() adds redundant 'fresh' transition as safety net since VisualMapTab.generateDiagram() already sets it"
metrics:
  duration: 233s
  completed: 2026-02-25
  tasks_completed: 3
  files_modified: 3
---

# Phase 05 Plan 05: Storage Wiring Gap Closure Summary

Complete wiring of the diagram generation pipeline to persistent storage (C4StorageService) and state management, fixing UAT gaps where diagrams were stored in v1.0 cache instead of v1.1 persistent storage.

## What Was Built

**Task 1: C4AnalyzerService -> C4StorageService migration**

Replaced `C4CacheService` (v1.0 TTL-based cache) with `C4StorageService` (v1.1 persistent storage) in `c4AnalyzerService.ts`:
- `getDiagram()` replaces `getCachedDiagram()` - reads from `diagram_storage.db`
- `storeDiagram()` replaces `setCachedDiagram()` - writes `StoredDiagram` with `state: 'fresh'`
- `deleteDiagramsForRepo()` replaces `clearCache()`
- Removed `clearExpiredCache()` (no TTL in v1.1)
- Removed `app` and `join` imports (no longer needed for cache path)

**Task 2: VisualMapTab -> persisted diagram loading**

Added persistent diagram loading to `VisualMapTab.tsx`:
- Import `useDiagramStateStore` and `GeneratePromptCard`
- `useEffect` on mount/repo/type change: calls `window.reef.c4Storage.getDiagram()`, loads diagram content and metadata if found, sets `viewMode` to 'diagram'
- Calls `window.reef.c4Storage.getRepoStates()` to sync frontend `diagramStateStore`
- Shows `GeneratePromptCard` when `viewMode === 'diagram'` but no content and state is `never_generated`

**Task 3: State transitions through generation lifecycle**

Added IPC state updates to `VisualMapTab.generateDiagram()`:
- `'generating'` at start (before API call)
- `'fresh'` after successful generation and `setMetadata()`
- `'error'` with user-friendly message in catch block

Added explicit `'fresh'` transition to `DiagramViewer.handleRegenerate()` as safety net after `onRegenerateDiagram()` call.

## Success Criteria Verification

- [x] C4AnalyzerService uses C4StorageService instead of C4CacheService
- [x] VisualMapTab loads persisted diagrams from storage on mount
- [x] GeneratePromptCard shown for repos with no diagrams
- [x] State transitions: never_generated -> generating -> fresh (or error)
- [x] Badge displays correct state (state store updated via IPC events)
- [x] Diagrams persist across tab navigation (loaded from storage on mount)
- [x] Diagrams persist across app restarts (SQLite persistence)
- [x] Storage stats show accurate diagram count (storeDiagram writes to same DB)
- [x] All TypeScript compiles without errors

## Commits

| Task | Description | Hash | Files |
|------|-------------|------|-------|
| 1 | Wire C4AnalyzerService to C4StorageService | c074691 | c4AnalyzerService.ts |
| 2 | Wire VisualMapTab to load persisted diagrams | 5f10057 | VisualMapTab.tsx |
| 3 | Wire state transitions in generation pipeline | 21e92a3 | VisualMapTab.tsx, DiagramViewer.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## Key Architecture Notes

The C4AnalyzerService creates its own `C4StorageService` instance separate from the singleton managed by `c4StorageHandlers.ts`. Both instances point to the same SQLite file. SQLite WAL mode handles concurrent access correctly - this is acceptable and avoids coupling the service to the IPC singleton pattern.

The `getRepoStates` IPC call returns `DiagramStateEntry[]` objects (mapped from `StoredDiagram` in `c4StorageHandlers.ts` lines 76-83), which is compatible with `loadStatesFromBackend()` in the `diagramStateStore`.

## Self-Check: PASSED

Files exist:
- src/main/services/c4/c4AnalyzerService.ts - FOUND, imports C4StorageService
- src/renderer/components/tabs/VisualMapTab.tsx - FOUND, imports useDiagramStateStore and GeneratePromptCard
- src/renderer/components/DiagramViewer/DiagramViewer.tsx - FOUND, has explicit 'fresh' transition

Commits exist:
- c074691 - FOUND (feat(05-05): wire C4AnalyzerService to C4StorageService)
- 5f10057 - FOUND (feat(05-05): wire VisualMapTab to load persisted diagrams)
- 21e92a3 - FOUND (feat(05-05): wire state transitions in generation pipeline)

TypeScript: npm run typecheck passes with 0 errors.
