# Phase 6: Auto-Generation on Repo Add - Research

**Researched:** 2026-02-25
**Domain:** Electron IPC, React modal/toast UI, background task queue, Zustand state management
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Generation Prompt UX**
- Modal dialog format — centered overlay, user must decide before continuing
- Cost estimate shown as a simple summary line (e.g., "Estimated: ~15k tokens (~$0.03)")
- Three action buttons: Generate Now, Skip, Always Generate for New Repos
- "Don't ask again" / skip variant: Claude's discretion on whether to include a checkbox

**Progress Experience**
- Progress shown in a status bar at the bottom of the app
- Overall percentage indicator (not per-C4-level breakdown)
- Cancel button in status bar to stop generation in progress — cleans up partial results
- Multi-repo queue handling: Claude's discretion (queue vs parallel, status bar presentation)

**Completion Notifications**
- Success: Toast notification (e.g., "Diagrams ready for repo-name"), auto-dismisses
- Failure: Error toast with retry button AND persistent error badge on repo in sidebar
- Toast quick-action to view diagrams: Claude's discretion
- Partial failure handling (some levels succeed, others fail): Claude's discretion

**Default Behavior & Preferences**
- "Always generate" preference accessible as toggle in existing settings page
- Manual trigger for skipped repos: "Generate Now" button in diagram view empty state (already exists as `GeneratePromptCard`)
- Default behavior before preference is set: Claude's discretion
- Retroactive generation for existing repos when preference enabled: Claude's discretion

### Claude's Discretion
- Modal close behavior after clicking "Generate Now" (immediate vs brief confirmation)
- Whether to include "Don't ask again" checkbox on Skip
- Multi-repo queue strategy (sequential vs parallel)
- Toast action linking to diagram view on success
- Partial failure handling strategy
- Default prompting behavior before user sets a preference
- Whether enabling "always generate" retroactively offers to generate for existing repos

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AGEN-01 | User sees prompt with cost estimate when adding repository asking whether to generate diagrams | Cost estimation exists in `tokenCounterService.estimateGenerationCost()`. Modal pattern: use existing `@radix-ui/react-dialog` already installed. Hook into `addRepository()` in `repositoryStore.ts`. |
| AGEN-02 | User can choose to generate diagrams immediately, skip for now, or set preference for all repos | Three-button modal. "Always generate" writes to `diagramSettingsService` (electron-store). The `autoGenerateOnLoad` field already exists in DiagramSettings type; needs a new `autoGenerateOnRepoAdd` field added. |
| AGEN-03 | User sees loading indicator with progress during diagram generation | Status bar at bottom of `MainLayout`. Progress is `current_level / 4` (context=25%, container=50%, component=75%, code=100%). Use Zustand store to broadcast progress. No new npm install needed. |
| AGEN-04 | Diagram generation runs in background queue without blocking UI | Background generation runs in Electron main process via IPC. Queue state lives in a new Zustand store (`generationQueueStore`). IPC channels send progress events to renderer. UI remains unblocked. |
| AGEN-05 | User receives notification when background generation completes | Custom toast component (no library — existing code uses `alert()`/manual UI). Build a simple `ToastNotification` component with auto-dismiss. Use Zustand `toastStore` for state. Attach to `MainLayout`. |

</phase_requirements>

## Summary

Phase 6 adds the "ask on repo add" prompt flow, background generation with progress, and toast notifications. All core infrastructure already exists: `@radix-ui/react-dialog` for the modal, `diagramSettingsService` (electron-store) for preferences, `C4AnalyzerService` with `generateC4Diagram()` for the actual generation, `C4StorageService` for state tracking, and the `c4-storage:state-changed` IPC event bus for real-time updates.

The generation pipeline runs synchronously in the Electron main process (C4AnalyzerService generates 4 C4 levels in sequence). Background execution means firing the IPC call from the renderer without `await`-blocking the UI. Progress tracking requires adding progress-event IPC channels from main to renderer — similar to how `c4-storage:state-changed` already broadcasts state changes to all windows.

The biggest discretionary choices this phase requires: the queue strategy (sequential is safer and simpler; parallel risks parallel disk/API contention), and the toast implementation (no toast library is installed — build a minimal custom component or install `sonner`). The evidence favors building a minimal custom component to stay consistent with the existing inline UI patterns and avoid a new dependency.

**Primary recommendation:** Wire the modal into `AddRepositoryModal.tsx` after the "Add Repository" button is clicked (between repo add and modal close). Add a `generationQueueStore` Zustand store for background progress state. Build a minimal `ToastNotification` React component attached in `MainLayout`. Use sequential per-repo generation.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@radix-ui/react-dialog` | ^1.1.14 (already installed) | Generation prompt modal | Already used in `ConfirmDialog.tsx` — same pattern |
| `zustand` | ^4.4.7 (already installed) | Generation queue store, toast store | All stores in the project use Zustand |
| `electron` IPC | ^38.8.2 (already installed) | Main→renderer progress events | Established pattern: `BrowserWindow.getAllWindows().forEach(win => win.webContents.send(...))` |
| `electron-store` | ^8.1.0 (already installed) | Persist "always generate" preference | `diagramSettingsService` already uses this |
| `lucide-react` | ^0.312.0 (already installed) | Toast/progress icons (Check, X, Loader2, AlertCircle) | All icons in the project come from here |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-progress` | NOT installed | Accessible progress bar | Would need npm install; alternative is a plain Tailwind div |
| `sonner` | NOT installed | Production-ready toast | Would need npm install; overkill for current usage patterns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom toast (Tailwind div + Zustand) | `sonner` (install new dep) | Sonner is production-quality with stacking/animations; custom keeps zero new deps and matches existing patterns. Project has zero existing toast infrastructure, so either starts from scratch. Recommend custom for now. |
| Custom progress bar (Tailwind div) | `@radix-ui/react-progress` | Radix Progress is accessible and animated; plain div is simpler and sufficient for a status bar indicator. Recommend plain div. |
| Sequential generation queue | Parallel per-repo generation | Parallel risks simultaneous API calls and disk I/O contention; sequential is safer and shows clear per-repo progress. Recommend sequential. |

**Installation (if custom toast approach):**
```bash
# No new dependencies needed
```

**Installation (if sonner approach):**
```bash
npm install sonner
```

## Architecture Patterns

### Recommended Project Structure

New files to create:
```
src/
├── main/
│   └── services/
│       └── c4/
│           └── generationQueueService.ts    # Background queue + IPC handlers
├── renderer/
│   ├── stores/
│   │   ├── generationQueueStore.ts          # Queue state (progress, current job)
│   │   └── toastStore.ts                    # Toast notification state
│   └── components/
│       ├── GenerationPromptModal.tsx        # The "generate on add?" modal
│       ├── GenerationStatusBar.tsx          # Bottom-of-app progress bar
│       └── ToastContainer.tsx              # Auto-dismiss toast notifications
```

Modified files:
```
src/
├── main/
│   ├── main.ts                              # Register new IPC handlers
│   └── preload.ts                           # Expose new IPC channels
├── renderer/
│   ├── components/
│   │   ├── AddRepositoryModal.tsx           # Hook in prompt flow
│   │   ├── layouts/MainLayout.tsx           # Mount StatusBar + ToastContainer
│   │   └── DiagramSettings/DiagramSettings.tsx  # Add "always generate" toggle
│   └── pages/
│       └── Settings.tsx                     # (if DiagramSettings toggle needs help)
```

### Pattern 1: Generation Prompt Modal Flow

**What:** After `addRepository()` succeeds, before `onClose()`, show `GenerationPromptModal`. User picks "Generate Now", "Skip", or "Always Generate for New Repos".

**When to use:** Every time a new repo is added, unless "always generate" preference is set (skip modal and generate immediately) or user preference is "never ask" (skip modal and don't generate).

**Example:**
```typescript
// In AddRepositoryModal.tsx — handleAddRepository()
const handleAddRepository = async () => {
  if (!selectedPath || !repoDetails) return;
  setIsLoading(true);
  setError(null);

  try {
    await addRepository({ name: repoDetails.name, path: selectedPath, ... });

    // Check preference before showing modal
    const settings = await window.reef.diagramSettings.get();
    if (settings.autoGenerateOnRepoAdd === 'always') {
      // Enqueue generation immediately, skip modal
      window.reef.c4Generation.enqueue(selectedPath, repoDetails.name);
      onClose();
    } else if (settings.autoGenerateOnRepoAdd === 'never') {
      onClose(); // Skip silently
    } else {
      // Show prompt modal
      setShowGenerationPrompt(true);
      // Do NOT call onClose() yet — modal handles it
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to add repository');
  } finally {
    setIsLoading(false);
  }
};
```

### Pattern 2: Background Generation via IPC (Non-blocking)

**What:** Renderer fires an IPC call and receives progress events asynchronously. Main process runs `C4AnalyzerService.generateC4Diagram()` for each of the 4 C4 levels and sends progress back.

**When to use:** Always — generation must not block the UI.

**Example — main process (generationQueueService.ts):**
```typescript
// Source: existing c4StorageHandlers.ts pattern + c4AnalyzerService.ts

import { ipcMain, BrowserWindow } from 'electron';
import { C4AnalyzerService } from './c4AnalyzerService';

const C4_LEVELS = ['context', 'container', 'component', 'code'] as const;

function broadcastProgress(repoPath: string, repoName: string, level: string, percent: number) {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('c4-generation:progress', { repoPath, repoName, level, percent });
  });
}

ipcMain.handle('c4-generation:enqueue', async (_, repoPath: string, repoName: string) => {
  // Fire-and-forget: do not await
  (async () => {
    broadcastProgress(repoPath, repoName, 'context', 0);
    let success = true;
    let errorMessage: string | undefined;

    for (let i = 0; i < C4_LEVELS.length; i++) {
      const level = C4_LEVELS[i];
      const percent = Math.round(((i + 1) / C4_LEVELS.length) * 100);
      try {
        await analyzer.generateC4Diagram(repoPath, level);
        broadcastProgress(repoPath, repoName, level, percent);
      } catch (err) {
        success = false;
        errorMessage = err instanceof Error ? err.message : 'Unknown error';
        break;
      }
    }

    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('c4-generation:complete', {
        repoPath, repoName, success, errorMessage,
      });
    });
  })();

  return { queued: true };
});
```

**Example — renderer store (generationQueueStore.ts):**
```typescript
import { create } from 'zustand';

interface GenerationJob {
  repoPath: string;
  repoName: string;
  percent: number;
  currentLevel: string;
  status: 'running' | 'complete' | 'error';
  errorMessage?: string;
}

interface GenerationQueueStore {
  jobs: Map<string, GenerationJob>;
  setProgress: (repoPath: string, repoName: string, level: string, percent: number) => void;
  setComplete: (repoPath: string, success: boolean, errorMessage?: string) => void;
  dismissJob: (repoPath: string) => void;
}

export const useGenerationQueueStore = create<GenerationQueueStore>((set, get) => ({
  jobs: new Map(),
  setProgress: (repoPath, repoName, level, percent) => {
    set(state => {
      const jobs = new Map(state.jobs);
      jobs.set(repoPath, { repoPath, repoName, percent, currentLevel: level, status: 'running' });
      return { jobs };
    });
  },
  setComplete: (repoPath, success, errorMessage) => {
    set(state => {
      const jobs = new Map(state.jobs);
      const existing = jobs.get(repoPath);
      if (existing) {
        jobs.set(repoPath, { ...existing, percent: 100, status: success ? 'complete' : 'error', errorMessage });
      }
      return { jobs };
    });
  },
  dismissJob: (repoPath) => {
    set(state => {
      const jobs = new Map(state.jobs);
      jobs.delete(repoPath);
      return { jobs };
    });
  },
}));
```

### Pattern 3: Cancel During Generation

**What:** User clicks Cancel in status bar. Main process needs a way to abort an in-progress generation.

**Approach:** Use a cancellation flag per repoPath in the main process service. Before each level, check the flag. If cancelled, clean up partial results by setting state to 'never_generated' for all levels.

**Example:**
```typescript
// In generationQueueService.ts
const cancellationFlags = new Map<string, boolean>();

ipcMain.handle('c4-generation:cancel', async (_, repoPath: string) => {
  cancellationFlags.set(repoPath, true);
  return { cancelled: true };
});

// In the generation loop:
if (cancellationFlags.get(repoPath)) {
  // Clean up partial results
  storage.deleteDiagramsForRepo(repoPath);
  cancellationFlags.delete(repoPath);
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('c4-generation:cancelled', { repoPath });
  });
  return;
}
```

### Pattern 4: Toast Notification (Custom)

**What:** Simple auto-dismiss toast using Zustand state + React component mounted in `MainLayout`.

**Example (ToastContainer.tsx):**
```typescript
import React, { useEffect } from 'react';
import { Check, AlertCircle, X } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';

export const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm ${
            toast.type === 'success'
              ? 'bg-gray-800 border border-green-700/50 text-gray-100'
              : 'bg-gray-800 border border-red-700/50 text-gray-100'
          }`}
        >
          {toast.type === 'success'
            ? <Check className="w-4 h-4 text-green-400 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          }
          <span>{toast.message}</span>
          {toast.action && (
            <button onClick={toast.action.onClick} className="text-blue-400 hover:text-blue-300 font-medium ml-2">
              {toast.action.label}
            </button>
          )}
          <button onClick={() => dismiss(toast.id)} className="ml-auto text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
```

### Pattern 5: "Always Generate" Preference Storage

**What:** New setting field `autoGenerateOnRepoAdd: 'prompt' | 'always' | 'never'` stored via `diagramSettingsService`.

**Integration points:**
1. Add field to `DiagramSettings` interface in `diagramSettingsService.ts` and `preload.ts`
2. Add toggle in `DiagramSettings.tsx` (Settings page) — existing settings form pattern
3. Read in `AddRepositoryModal.tsx` to decide whether to show modal

**Default:** `'prompt'` (show the modal — safest default before user sets preference).

### Anti-Patterns to Avoid
- **Blocking the UI on generation:** Never `await` the IPC generation call from the renderer's main thread. Fire it and return immediately.
- **Storing generation preference in Zustand only:** Must persist to `diagramSettingsService` (electron-store) so it survives restarts.
- **Showing modal before `addRepository()` completes:** The cost estimate requires knowing the repo path (for potential token counting); show modal only after the repo is successfully added.
- **Hardcoding 4 C4 levels in the renderer:** The number of levels is an implementation detail in the main process. Pass level names/count in the progress events.
- **Forgetting to wire `onStateChanged` for the new repo:** After background generation succeeds, the `c4-storage:state-changed` IPC events already flow through the existing `diagramStateStore` pipeline. No extra wiring needed for the badge — it updates automatically.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal accessible overlay | Custom div with manual focus trap | `@radix-ui/react-dialog` | Already installed; handles focus trap, escape key, aria roles automatically |
| IPC event subscription cleanup | Manual `ipcRenderer.on` / `ipcRenderer.removeListener` in components | Pattern from `c4Storage.onStateChanged` in preload.ts | Returns unsubscribe function; avoids memory leaks |
| Preference persistence | localStorage or Zustand persist | `diagramSettingsService` via `window.reef.diagramSettings.set()` | Electron-store survives app restarts; already the settings pattern |

**Key insight:** The generation infrastructure (C4AnalyzerService, C4StorageService, state IPC bus) is already complete from Phase 5. Phase 6 is entirely about wiring the UI prompt, backgrounding the calls, and surfacing results to the user.

## Common Pitfalls

### Pitfall 1: Generation Blocks Electron Main Thread
**What goes wrong:** `ipcMain.handle('c4-generation:enqueue', async (_, ...) => { await generateAllLevels(); })` — this holds the IPC handler open for 30-120 seconds while generating. All other IPC calls from the renderer queue behind it.
**Why it happens:** Electron's ipcMain.handle is async but the renderer is blocked waiting for the return value if the caller awaits it.
**How to avoid:** Inside the handler, start generation in a detached async IIFE and return `{ queued: true }` immediately. Never await the full generation inside the handler.
**Warning signs:** UI freezes after clicking "Generate Now" until generation completes.

### Pitfall 2: Missing Cancellation Cleanup
**What goes wrong:** User cancels; partial diagrams remain in storage with `state = 'generating'` or `state = 'fresh'` for completed levels. On next app launch, those levels show as fresh but are incomplete (e.g., context is fresh, but container/component/code are never_generated).
**Why it happens:** Cancel interrupts the loop but doesn't clean up what was already stored.
**How to avoid:** On cancel, call `C4StorageService.deleteDiagramsForRepo()` to wipe all levels, then emit `c4-storage:state-changed` for each to update the frontend. Or, keep completed levels and only mark incomplete levels as never_generated.
**Warning signs:** Diagram view shows fresh badge for some levels but empty state for others.

### Pitfall 3: Toast Memory Leak (Event Listener Not Cleaned Up)
**What goes wrong:** Component that subscribes to `c4-generation:complete` events unmounts without removing the listener. On next generation, duplicate listeners fire, causing duplicate toasts.
**Why it happens:** Missing cleanup in `useEffect` return function.
**How to avoid:** Follow the existing `onStateChanged` pattern in preload.ts — return an unsubscribe function from `useEffect`.

```typescript
useEffect(() => {
  const unsubscribe = window.reef.c4Generation.onComplete((_, data) => {
    addToast({ type: data.success ? 'success' : 'error', ... });
  });
  return unsubscribe;
}, []);
```

### Pitfall 4: Cost Estimate Requires Static Analysis
**What goes wrong:** Calling `tokenCounterService.estimateGenerationCost()` in the renderer requires running ts-morph static analysis first, which is a 1-5 second async operation. If the modal waits for this, it delays the modal appearing.
**Why it happens:** The cost estimate depends on counting tokens in the extracted context, which requires actually reading the repo files.
**How to avoid:** Use a heuristic estimate (e.g., "~15k tokens (~$0.03)" based on the fixed `TARGET_TOKENS = 15000` in `DiagramGeneratorServiceV2`) rather than running a real analysis. The user decision already says "simple summary line." Do not run static analysis just for the cost estimate.
**Warning signs:** Modal takes 3+ seconds to appear after clicking "Add Repository."

### Pitfall 5: "Always Generate" Preference Not Added to DiagramSettings Type
**What goes wrong:** New field `autoGenerateOnRepoAdd` added to DiagramSettings in one place (e.g., DiagramSettings.tsx) but not in `diagramSettingsService.ts` or `preload.ts`. TypeScript errors or silently ignored field.
**Why it happens:** The DiagramSettings type is defined in three places: `src/main/services/diagramSettingsService.ts`, `src/main/preload.ts`, and `src/renderer/components/DiagramSettings/DiagramSettings.tsx`.
**How to avoid:** Add the field to all three locations, or extract the type to `src/shared/types/` and import from there.

### Pitfall 6: Status Bar Overlap with Other UI Elements
**What goes wrong:** Fixed-position status bar at bottom of app overlaps with content or is hidden behind other elements at certain z-index layers.
**Why it happens:** Multiple fixed-position elements (toast, status bar) compete for bottom space.
**How to avoid:** Status bar and toast should be in different positions (status bar full-width bottom; toasts in bottom-right corner) and use different `z-index` values. Confirm they don't both appear at the same time in the same position.

## Code Examples

Verified patterns from the existing codebase:

### IPC Handler Pattern (main process fires event to all windows)
```typescript
// Source: src/main/services/c4/c4StorageHandlers.ts:55-63
BrowserWindow.getAllWindows().forEach(win => {
  win.webContents.send('c4-storage:state-changed', {
    repoPath,
    level,
    elementId,
    state,
    errorMessage,
  });
});
```

### Preload API Exposure Pattern
```typescript
// Source: src/main/preload.ts:203-206
onStateChanged: (callback: (event: any, data: any) => void) => {
  ipcRenderer.on('c4-storage:state-changed', callback);
  return () => ipcRenderer.removeListener('c4-storage:state-changed', callback);
},
```

### Radix Dialog Modal Pattern (already in project)
```typescript
// Source: src/renderer/components/ui/ConfirmDialog.tsx
import * as Dialog from '@radix-ui/react-dialog';

<Dialog.Root open={open} onOpenChange={onOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-md p-6">
      <Dialog.Title>...</Dialog.Title>
      <Dialog.Description>...</Dialog.Description>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### DiagramSettings Save Pattern
```typescript
// Source: src/renderer/components/DiagramSettings/DiagramSettings.tsx:75-82
const saveSettings = async (newSettings: DiagramSettings) => {
  try {
    await window.reef.diagramSettings.set(newSettings);
  } catch (error) {
    console.error('Failed to save diagram settings:', error);
  }
};
```

### Fire-and-Forget IPC from Renderer
```typescript
// Pattern: invoke without await for non-blocking background work
// (no existing example — this is new for Phase 6)
const handleGenerateNow = async () => {
  setShowGenerationPrompt(false);
  onClose();
  // Non-blocking — do NOT await
  window.reef.c4Generation.enqueue(selectedPath, repoDetails.name);
};
```

### C4AnalyzerService Entry Point (existing)
```typescript
// Source: src/main/services/c4/c4AnalyzerService.ts:39-43
async generateC4Diagram(
  repoPath: string,
  level: C4Level,
  elementId?: string
): Promise<DiagramResult>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| v1.0 TTL-based cache | v1.1 persistent storage with state machine | Phase 5 | Generation can now track `generating` → `fresh` transitions across restarts |
| Manual `setIsGenerating` in VisualMapTab | Centralized `diagramStateStore` with IPC sync | Phase 5 | State badges update automatically from main process events |
| `autoGenerateOnLoad` (unused boolean in settings) | New `autoGenerateOnRepoAdd: 'prompt' | 'always' | 'never'` | Phase 6 | More expressive preference; old field may conflict — check before adding |

**Deprecated/outdated:**
- `autoGenerateOnLoad: boolean` in `DiagramSettings`: This field exists in both `diagramSettingsService.ts` and `DiagramSettings.tsx` but is not currently used anywhere in the generation flow. Phase 6 should either repurpose this for "auto generate on repo add" or add a new, more explicitly named field. Adding a new field is cleaner and avoids ambiguity.

## Open Questions

1. **Cost estimate approach for the modal**
   - What we know: `tokenCounterService.estimateGenerationCost()` exists but requires running context extraction first (slow)
   - What's unclear: Should we do a real estimate or a heuristic (~15k tokens × haiku rate)?
   - Recommendation: Use heuristic based on `TARGET_TOKENS = 15000` and haiku pricing ($0.25/M input + $1.25/M output ≈ $0.006 for context + ~$0.002 for output = ~$0.008 per level × 4 levels ≈ $0.03 total). This matches the example in CONTEXT.md. No async work needed before showing modal.

2. **Partial failure handling**
   - What we know: Context.md marks this as "Claude's discretion"
   - What's unclear: If context generates OK but container fails, what state do we show?
   - Recommendation: Show error toast with "Diagrams partially generated for repo-name — context level ready." Set failed levels to `state = 'error'` in C4StorageService. Completed levels remain `fresh`. The DiagramStateBadge already handles the error state with a retry button.

3. **Default prompting behavior**
   - What we know: CONTEXT.md says "Claude's discretion" for default before preference is set
   - What's unclear: Should we prompt, auto-generate, or skip by default?
   - Recommendation: Default to `'prompt'` (show modal). This is the only choice that respects user agency on first use. The modal itself provides the mechanism to set "always generate" or "skip" for future repos.

4. **Retroactive generation when enabling "always generate"**
   - What we know: CONTEXT.md says "Claude's discretion"
   - What's unclear: Scanning all existing repos for `never_generated` state and offering to generate is non-trivial
   - Recommendation: Do not retroactively generate when enabling the setting. The `GeneratePromptCard` already handles the empty-state case for existing repos — users can trigger it manually. Keep Phase 6 scope tight.

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `src/main/services/c4/c4StorageHandlers.ts`, `c4AnalyzerService.ts`, `c4StorageService.ts`
- Codebase direct inspection — `src/renderer/components/AddRepositoryModal.tsx`, `VisualMapTab.tsx`, `DiagramViewer.tsx`
- Codebase direct inspection — `src/main/preload.ts`, `src/main/main.ts`
- Codebase direct inspection — `src/renderer/stores/diagramStateStore.ts`, `repositoryStore.ts`
- Codebase direct inspection — `src/main/services/diagramSettingsService.ts`, `tokenCounterService.ts`
- `package.json` — confirmed installed dependencies (no toast library, no progress library)
- `@radix-ui/react-dialog` confirmed installed under `node_modules/@radix-ui/`

### Secondary (MEDIUM confidence)
- Radix UI dialog API — confirmed via existing `ConfirmDialog.tsx` usage pattern in project
- Electron IPC fire-and-forget pattern — inferred from `ipcMain.handle` + existing async pattern

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified directly from package.json and node_modules
- Architecture: HIGH — all patterns traced to existing working code in the project
- Pitfalls: HIGH — derived from direct analysis of existing code structure and known IPC/Electron constraints

**Research date:** 2026-02-25
**Valid until:** 2026-04-25 (stable libraries, no fast-moving dependencies)
