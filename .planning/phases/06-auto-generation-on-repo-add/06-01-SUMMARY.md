---
phase: 06-auto-generation-on-repo-add
plan: 01
subsystem: background-generation-infrastructure
tags: [ipc, electron, generation-queue, preload, settings]
dependency_graph:
  requires: []
  provides:
    - c4-generation IPC pipeline (enqueue, cancel, get-cost-estimate, progress, complete, cancelled)
    - AutoGeneratePreference type persisted via electron-store
    - c4Generation preload API with event subscriptions
  affects:
    - src/main/main.ts (handler registration)
    - src/main/preload.ts (API surface)
    - src/main/services/diagramSettingsService.ts (settings schema)
tech_stack:
  added: []
  patterns:
    - Detached async IIFE for non-blocking IPC handler
    - BrowserWindow.getAllWindows() broadcast pattern
    - safeStorage API key retrieval at enqueue time
    - Event subscription with unsubscribe return value
key_files:
  created:
    - src/main/services/c4/generationQueueService.ts
  modified:
    - src/shared/types/generationQueue.ts (already existed, verified complete)
    - src/main/preload.ts
    - src/main/main.ts
    - src/main/services/diagramSettingsService.ts
    - src/renderer/components/DiagramSettings/DiagramSettings.tsx
decisions:
  - API key retrieved from safeStorage at enqueue time (not at service init) — matches DiagramGeneratorService pattern
  - autoGenerateOnRepoAdd defaults to 'prompt' — shows modal asking user, never silently triggers generation
  - DiagramSettings.tsx local interface updated alongside preload.ts to prevent TypeScript compile error
metrics:
  duration_seconds: 134
  completed_date: "2026-02-25"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 4
---

# Phase 6 Plan 1: Background Generation Queue Infrastructure Summary

**One-liner:** Non-blocking IPC generation queue with API key retrieval at runtime, broadcast progress/complete events, and autoGenerateOnRepoAdd preference persisted via electron-store.

## What Was Built

- `generationQueueService.ts`: Main-process service with three IPC handlers
  - `c4-generation:enqueue` — returns `{ queued: true }` immediately; runs 4-level generation in a detached async IIFE
  - `c4-generation:cancel` — sets a per-repo cancellation flag checked before each level
  - `c4-generation:get-cost-estimate` — returns heuristic estimate (~60k tokens, ~$0.03) without async analysis
- `src/shared/types/generationQueue.ts` — `GenerationProgress`, `GenerationComplete`, `AutoGeneratePreference` types (was already in place from prior context)
- `preload.ts` — `c4Generation` API exposed to renderer: enqueue, cancel, getCostEstimate, onProgress, onComplete, onCancelled (each subscription returns unsubscribe function)
- `diagramSettingsService.ts` — `autoGenerateOnRepoAdd: 'prompt'` default added to settings interface and defaults

## Key Design Decisions

1. **API key at enqueue time:** The `C4AnalyzerService` requires an `apiKey` constructor parameter. Rather than storing the key in the service module, it's read from safeStorage at the moment `enqueue` is called. This matches the pattern in `DiagramGeneratorService` and avoids long-lived key exposure.

2. **Detached async IIFE:** The generation loop is started with `void (async () => { ... })()` inside the ipcMain handler. The handler returns `{ queued: true }` before the loop starts. This is the core non-blocking pattern.

3. **Cancellation with cleanup:** When a cancellation flag is detected between C4 levels, `getStorageService().deleteDiagramsForRepo(repoPath)` removes partial results before broadcasting `c4-generation:cancelled`.

4. **Default 'prompt':** `autoGenerateOnRepoAdd` defaults to `'prompt'` so the app shows a modal instead of silently triggering expensive API calls.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Field] Added autoGenerateOnRepoAdd to DiagramSettings.tsx local interface**
- **Found during:** Task 2 verification (`npx tsc --noEmit`)
- **Issue:** `DiagramSettings.tsx` exports its own `DiagramSettings` interface that was passed to `window.reef.diagramSettings.set()`. After adding `autoGenerateOnRepoAdd` to `preload.ts`'s `DiagramSettings` interface, TypeScript reported a mismatch because the renderer component's local interface lacked the new field.
- **Fix:** Added `autoGenerateOnRepoAdd: 'prompt' | 'always' | 'never'` to both the interface and the `useState` initial value in `DiagramSettings.tsx`. The plan noted Plan 06-03 Task 2 would update this component, but the TypeScript error was immediate and blocked compilation.
- **Files modified:** `src/renderer/components/DiagramSettings/DiagramSettings.tsx`
- **Commit:** 6d878e9

**2. [Rule 1 - Adaptation] API key retrieved at enqueue time, not at service init**
- **Found during:** Task 1 implementation
- **Issue:** The plan stated "Create `analyzer = new C4AnalyzerService();`" implying no-arg constructor, but `C4AnalyzerService(apiKey: string)` requires an API key. There is no module-level singleton pattern possible without storing the key at startup.
- **Fix:** Moved `C4AnalyzerService` instantiation inside the enqueue IIFE, retrieving the API key from safeStorage at call time. If no key is configured, broadcasts `c4-generation:complete` with `success: false` and a user-friendly error message.
- **Files modified:** `src/main/services/c4/generationQueueService.ts`
- **Commit:** 8b412e4

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create shared types and generationQueueService | 8b412e4 | generationQueueService.ts (created) |
| 2 | Expose c4Generation API in preload and register handlers | 6d878e9 | preload.ts, main.ts, diagramSettingsService.ts, DiagramSettings.tsx |

## Self-Check: PASSED

Files verified:
- FOUND: src/main/services/c4/generationQueueService.ts
- FOUND: src/shared/types/generationQueue.ts
- FOUND: src/main/preload.ts (contains c4Generation)
- FOUND: src/main/services/diagramSettingsService.ts (contains autoGenerateOnRepoAdd)

Commits verified:
- FOUND: 8b412e4
- FOUND: 6d878e9

TypeScript: `npx tsc --noEmit` passes with zero errors.
