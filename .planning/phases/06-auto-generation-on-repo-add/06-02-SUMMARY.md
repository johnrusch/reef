---
phase: 06-auto-generation-on-repo-add
plan: 02
subsystem: ui
tags: [zustand, react, typescript, generation-queue, toast-notifications, progress-bar]

# Dependency graph
requires:
  - phase: 06-auto-generation-on-repo-add
    provides: "GenerationProgress and GenerationComplete shared types; c4Generation IPC API in preload.ts"
provides:
  - "generationQueueStore: Zustand store tracking per-repo generation jobs with progress/complete/cancel setters"
  - "toastStore: Zustand store for toast notifications with auto-dismiss timer and 5-toast cap"
  - "GenerationStatusBar: fixed bottom status bar with progress bar, percentage, and cancel button"
  - "ToastContainer: fixed bottom-right toast stack with type icons, action buttons, and auto-dismiss"
  - "shared types: AutoGeneratePreference, GenerationProgress, GenerationComplete in generationQueue.ts"
affects: [06-03, 06-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zustand store with Map for per-repo job tracking (same pattern as diagramStateStore)"
    - "Auto-dismiss timer set inside addToast store action (no React effect cleanup complexity)"
    - "Toast cap at 5 via array slice on add"
    - "Z-index layering: status bar z-40, toasts z-50 at bottom-12 to avoid overlap"

key-files:
  created:
    - src/shared/types/generationQueue.ts
    - src/renderer/stores/generationQueueStore.ts
    - src/renderer/stores/toastStore.ts
    - src/renderer/components/GenerationStatusBar.tsx
    - src/renderer/components/ToastContainer.tsx
  modified:
    - src/renderer/components/DiagramSettings/DiagramSettings.tsx

key-decisions:
  - "Auto-dismiss timer lives in store addToast(), not React useEffect — simpler, avoids cleanup complexity"
  - "Toast capped at 5 via array slice — removes oldest when at limit"
  - "Status bar z-40, toasts z-50 with bottom-12 offset to avoid overlap when both visible"
  - "GenerationStatusBar uses window.reef.c4Generation.cancel() directly — store does not call IPC"
  - "Shared types file created in Plan 06-02 (not 06-01) since 06-02 ran first in Wave 1"

patterns-established:
  - "Pattern: Zustand store with Map<string, Job> for per-entity state tracking (consistent with diagramStateStore)"
  - "Pattern: UI components receive no callbacks — they read store hooks directly and call window.reef APIs"
  - "Pattern: Fixed positioning uses z-40/z-50 layering with bottom offset for coexistence"

requirements-completed: [AGEN-03, AGEN-05]

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 06 Plan 02: Frontend Generation Queue Stores and UI Components Summary

**Zustand generation queue store + toast store + GenerationStatusBar and ToastContainer components providing visual feedback for background C4 diagram generation**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-25T22:44:12Z
- **Completed:** 2026-02-25T22:46:52Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created `generationQueueStore` with Map-based per-repo job tracking and setters for progress, completion, cancel, dismiss, and add
- Created `toastStore` with auto-dismiss timer, 5-toast cap, and success/error/info support with optional action buttons
- Created `GenerationStatusBar` showing live percentage progress, spinner, repo name, and cancel button; hidden when idle
- Created `ToastContainer` with stacked toasts at bottom-right, type-specific icons, action buttons, and dismiss
- Created shared types file `generationQueue.ts` (AutoGeneratePreference, GenerationProgress, GenerationComplete)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create generationQueueStore and toastStore Zustand stores** - `bad25de` (feat)
2. **Task 2: Create GenerationStatusBar and ToastContainer components** - `73fb6ac` (feat)

## Files Created/Modified

- `src/shared/types/generationQueue.ts` - Shared types for generation queue IPC events
- `src/renderer/stores/generationQueueStore.ts` - Zustand store tracking generation jobs by repoPath
- `src/renderer/stores/toastStore.ts` - Zustand store for toast notification state with auto-dismiss
- `src/renderer/components/GenerationStatusBar.tsx` - Fixed bottom progress bar with cancel button (z-40)
- `src/renderer/components/ToastContainer.tsx` - Fixed bottom-right toast stack with stacking and dismiss (z-50)
- `src/renderer/components/DiagramSettings/DiagramSettings.tsx` - Added missing autoGenerateOnRepoAdd field (bug fix)

## Decisions Made

- Auto-dismiss timer lives in store `addToast()` action rather than React `useEffect` — simpler implementation, avoids cleanup complexity in the store layer
- Toast capped at 5 by removing oldest (slice) when at limit to prevent UI overflow
- Status bar uses `z-40`, toasts use `z-50` with `bottom-12` positioning so both can coexist when generation is active and a toast fires simultaneously
- `GenerationStatusBar` calls `window.reef.c4Generation.cancel()` directly — the Zustand store tracks state but doesn't initiate IPC calls

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing `autoGenerateOnRepoAdd` field in DiagramSettings renderer interface**
- **Found during:** Task 2 (TypeScript compile verification)
- **Issue:** Plan 06-01 added `autoGenerateOnRepoAdd: 'prompt' | 'always' | 'never'` to the preload.ts `DiagramSettings` interface but the renderer-side `DiagramSettings.tsx` component interface was not updated, causing `TS2345` type mismatch on `window.reef.diagramSettings.set(newSettings)` call
- **Fix:** Added `autoGenerateOnRepoAdd: 'prompt' | 'always' | 'never'` to the exported `DiagramSettings` interface in `DiagramSettings.tsx` with default value `'prompt'`
- **Files modified:** `src/renderer/components/DiagramSettings/DiagramSettings.tsx`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `73fb6ac` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary fix for TypeScript correctness. Pre-existing bug from Plan 06-01 that blocked clean compilation. No scope creep.

## Issues Encountered

- `jsx: "react-jsx"` (new JSX transform) is configured in tsconfig, so explicit `import React from 'react'` is unused — removed from both components to clear TypeScript `noUnusedLocals` errors

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Stores and components ready to be mounted in MainLayout (Plan 06-03)
- `GenerationStatusBar` and `ToastContainer` export named functions — ready for import
- `useGenerationQueueStore` and `useToastStore` export hooks — Plan 06-03 uses these for IPC event wiring
- No new npm dependencies added

---
*Phase: 06-auto-generation-on-repo-add*
*Completed: 2026-02-25*
