# Phase 10: State Transition Wiring & Cleanup - Research

**Researched:** 2026-02-28
**Domain:** Electron IPC state wiring, cross-service singleton usage, dead code cleanup
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STOR-04 | App tracks diagram state (never_generated, generating, fresh, stale, error) | The IPC pipeline for state-changed notifications exists and works correctly for renderer-initiated flows. The gap is that `C4AnalyzerService` writes state directly to its own private `C4StorageService` instance, bypassing the singleton's IPC broadcast. Fix: inject `getStorageService()` into `C4AnalyzerService` rather than constructing a new `C4StorageService`. |
| AGEN-04 | Diagram generation runs in background queue without blocking UI | `generationQueueService` correctly runs generation in a detached async IIFE (non-blocking). The gap is that it never calls `getStorageService().updateState()` at level transitions, so `c4-storage:state-changed` is never broadcast during background generation. Fix: call `updateState('generating', level)` before each level and `updateState('fresh', level)` after each level succeeds, using the singleton. |
| AGEN-05 | User receives notification when background generation completes | `c4-generation:complete` toast notification fires correctly. The gap is only the badge update (badge never sees `fresh` state). Fix is the same as AGEN-04 — once state transitions flow through the singleton, the existing `c4-storage:state-changed` → `diagramStateStore` → `DiagramStateBadge` pipeline delivers the visual update automatically. |
</phase_requirements>

---

## Summary

Phase 10 fixes three cross-phase integration gaps discovered in the v1.1 milestone audit. None require new architecture — all fixes operate within already-established patterns and wiring points. The bulk of the work is surgical: wiring `generationQueueService` to call `updateState()` at the right moments, switching `C4AnalyzerService` from a private storage instance to the exported `getStorageService()` singleton, and deleting the dead `diagram:stale` IPC listener from `DiagramViewer.tsx`.

The IPC notification pipeline (`c4-storage:update-state` → `c4-storage:state-changed` → `diagramStateStore.setState()` → `DiagramStateBadge`) is already complete and proven for the renderer-initiated regeneration path. Phase 10 extends it to the background generation path without any structural changes.

The three issues range in severity: Issue 1 (HIGH) is the primary functional gap — background auto-generation never updates the badge. Issue 2 (MEDIUM) is a correctness gap — `C4AnalyzerService` writes to a second SQLite connection that cannot emit IPC state events. Issue 3 (LOW) is dead code that can cause confusing behavior if someone re-enables the stale IPC channel in the future.

**Primary recommendation:** Fix all three issues in a single plan. The changes are tightly related (Issues 1 and 2 share the same fix location) and together they close Flow 3 end-to-end.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | (installed) | SQLite storage with WAL mode | Already used throughout storage layer — no new dependencies |
| Electron IPC (ipcMain/BrowserWindow) | (Electron 28) | State-changed broadcast to renderer | Already used in `c4StorageHandlers.ts` — same pattern extends to queue service |
| Zustand (useDiagramStateStore) | (installed) | Renderer state store updated by IPC events | Established pattern from Phase 5/7 — no changes needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript strict checks | project standard | Ensure no type regressions when refactoring storage injection | Always |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Injecting `getStorageService()` into `C4AnalyzerService` | Constructor injection via `dbPath` param | Injection is cleaner but adds a new constructor signature; using the exported singleton is simpler and consistent with how `generationQueueService` already calls `getStorageService()` for `deleteDiagramsForRepo` |
| Calling IPC `c4-storage:update-state` from the queue service | Directly calling `getStorageService().updateState()` + broadcasting | Direct singleton call is synchronous, avoids an unnecessary ipcMain roundtrip, and is the correct pattern for main-process services |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Pattern 1: Main-Process State Update + IPC Broadcast

This is the established pattern from `c4StorageHandlers.ts:52-70`. The `c4-storage:update-state` IPC handler does two things atomically: writes to SQLite and then broadcasts `c4-storage:state-changed` to all windows.

```typescript
// Source: src/main/services/c4/c4StorageHandlers.ts lines 52-70
ipcMain.handle('c4-storage:update-state', async (_, repoPath, level, state, elementId, errorMessage) => {
  getStorageService().updateState(repoPath, level as C4Level, state, elementId, errorMessage);

  // Clear change tracking when diagram becomes fresh or starts regenerating
  if (state === 'fresh' || state === 'generating') {
    getStorageService().clearChangeTracking(repoPath, level as C4Level);
  }

  // Notify all windows of state change
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('c4-storage:state-changed', {
      repoPath, level, elementId, state, errorMessage,
    });
  });

  return { success: true };
});
```

**What Phase 10 adds:** `generationQueueService` must replicate this logic inline using `getStorageService()` directly (not via IPC, since it is already in the main process). The broadcast is a separate call to `BrowserWindow.getAllWindows()`, which the service already does for progress/complete events via `broadcastToAll()`.

### Pattern 2: Singleton Storage Access

`generationQueueService` already imports and calls `getStorageService()` for cleanup after cancellation (line 78). This is the correct pattern. The fix for Issue 2 extends the same pattern into `C4AnalyzerService`.

```typescript
// Current use of singleton (correct pattern — extend this)
// src/main/services/c4/generationQueueService.ts line 4
import { getStorageService } from './c4StorageHandlers';

// line 78 (cancellation cleanup)
getStorageService().deleteDiagramsForRepo(repoPath);
```

### Pattern 3: Renderer IPC State Subscription

`DiagramViewer.tsx` already subscribes to `c4-storage:state-changed` at lines 304-327. Once Issue 1 is fixed and state transitions are broadcast, the renderer updates automatically without any renderer-side changes.

```typescript
// Source: DiagramViewer.tsx lines 304-327
const unsubscribe = window.reef.c4Storage.onStateChanged((_, data) => {
  if (data.repoPath === repoPath) {
    setState(data.repoPath, data.level, data.state, data.elementId, data.errorMessage);
    // ... change tracking updates
  }
});
```

### Anti-Patterns to Avoid

- **Private C4StorageService in C4AnalyzerService constructor:** The existing `this.storage = new C4StorageService()` in `C4AnalyzerService` creates a second SQLite connection. While WAL mode prevents write conflicts, writes through this private instance cannot trigger IPC broadcasts because `c4StorageHandlers` only broadcasts from the singleton. Remove this and replace with `getStorageService()`.
- **Calling `ipcMain.handle('c4-storage:update-state')` from within main process:** Do not invoke IPC handlers from within the main process — call the storage service methods directly, then broadcast separately.
- **Circular imports:** `c4AnalyzerService` importing `c4StorageHandlers` (which is in the same `c4/` directory) is safe. No circular risk since `c4StorageHandlers` does not import `c4AnalyzerService`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State broadcast to renderer | Custom event emitter or polling | `BrowserWindow.getAllWindows().forEach(win => win.webContents.send(...))` | Already established pattern — consistent with `broadcastToAll()` helper already in `generationQueueService` |
| SQLite connection management | New connection per service | `getStorageService()` singleton from `c4StorageHandlers` | WAL mode handles concurrent reads, but IPC broadcasts are tied to the singleton's write path |

**Key insight:** The broadcast pipeline already exists end-to-end. Phase 10 only needs to call into it at the right moments — no new infrastructure required.

---

## Common Pitfalls

### Pitfall 1: Forgetting to Call updateState Before AND After Each Level

**What goes wrong:** Only calling `updateState('fresh')` at the end (after all 4 levels) means the badge shows `never_generated` until the very last moment.

**Why it happens:** Natural inclination to update state only on completion.

**How to avoid:** Call `updateState('generating', level)` before `analyzer.generateC4Diagram(repoPath, level)` for each level, and `updateState('fresh', level)` immediately after success. This matches how the renderer-initiated path in `DiagramViewer.handleRegenerate()` works.

**Warning signs:** Badge jumps directly from `never_generated` to `fresh` without showing `generating` for individual levels.

### Pitfall 2: updateState on Missing Row

**What goes wrong:** `C4StorageService.updateState()` runs a SQL `UPDATE`. If no row exists in `diagram_storage` for the (repoPath, level) combination (which can happen on first-ever generation before any `storeDiagram` call), the UPDATE is a no-op and the IPC broadcast still fires but with no persistent state change.

**Why it happens:** `generationQueueService` starts levels that have never been generated before — the `generating` state update happens before `storeDiagram` is called by `C4AnalyzerService`.

**How to avoid:** For the `generating` state, use an upsert or check whether a row exists. Alternatively, accept that the `generating` broadcast fires (renderer gets the event) even if the row doesn't exist yet — the renderer's Zustand store will still be updated. The `fresh` state fires after `C4AnalyzerService.storeDiagram()` which creates the row, so that call is safe. Document this known behavior.

**Warning signs:** `getState()` returns `never_generated` immediately after `updateState('generating', ...)` is called (indicates the UPDATE found no row).

**Recommended approach:** For `generating` state, also call `storeDiagram` with state=`generating` first if the row doesn't exist, or accept that the SQL UPDATE is a no-op and only the IPC broadcast matters for UI updates (since the renderer subscribes to events, not polling). The existing `C4AnalyzerService.storeDiagram()` call at the end will establish the row with state=`fresh`.

### Pitfall 3: C4AnalyzerService.close() Calling storage.close() on Singleton

**What goes wrong:** `C4AnalyzerService.close()` currently calls `this.storage.close()` (line 268). If `this.storage` is changed to point at the singleton returned by `getStorageService()`, calling `.close()` on it will close the shared connection and break all subsequent storage operations.

**Why it happens:** The `close()` method was designed for a private instance.

**How to avoid:** Remove `C4AnalyzerService.close()` or make it a no-op when using the singleton. The singleton's connection is managed by `cleanupC4Storage()` in `main.ts` during app shutdown.

### Pitfall 4: Dead Listener Leaves isStale State Dangling

**What goes wrong:** Removing the `diagram:stale` listener leaves the `isStale` local React state behind. If `isStale` was ever set to `true` by some past interaction before the listener removal, that state would persist until a navigation occurs.

**Why it happens:** `isStale` is local component state controlled by the now-dead listener.

**How to avoid:** When removing the dead `diagram:stale` listener useEffect block (lines 357-371 in DiagramViewer.tsx), also check whether `isStale` state and `setIsStale` are still used elsewhere in the component. They are — the `fileWatcher.checkStaleness()` call at line 388 still sets `isStale`. The `isStale` state itself is not dead; only the `diagram:stale` IPC listener is dead. Remove only the useEffect block that subscribes to `diagram:stale`.

### Pitfall 5: broadcastToAll vs Direct BrowserWindow Emit

**What goes wrong:** Using the local `broadcastToAll` helper in `generationQueueService` for the state-changed event would work but would skip the `clearChangeTracking` side-effect that the IPC handler performs.

**Why it happens:** `broadcastToAll` is a thin wrapper; `c4-storage:update-state` handler does more.

**How to avoid:** In `generationQueueService`, call both `getStorageService().updateState(...)` AND `getStorageService().clearChangeTracking(...)` AND `broadcastToAll('c4-storage:state-changed', ...)` when transitioning to `generating` or `fresh`. This replicates the three-step logic from `c4StorageHandlers.ts`. Alternatively, extract a shared helper function that contains this logic.

---

## Code Examples

### Fix 1: generationQueueService — updateState at Each Level Transition

```typescript
// Source: src/main/services/c4/generationQueueService.ts (AFTER fix)
// Add these calls around the existing analyzer.generateC4Diagram() call

for (let i = 0; i < C4_LEVELS.length; i++) {
  if (cancellationFlags.get(repoPath)) { /* ... existing cancellation logic ... */ }

  const level = C4_LEVELS[i];
  const percent = Math.round(((i + 1) / C4_LEVELS.length) * 100);

  // NEW: Emit 'generating' state before starting each level
  getStorageService().updateState(repoPath, level, 'generating');
  getStorageService().clearChangeTracking(repoPath, level);
  broadcastToAll('c4-storage:state-changed', { repoPath, level, state: 'generating' });

  broadcastToAll('c4-generation:progress', {
    repoPath, repoName, currentLevel: level, percent,
  });

  try {
    await analyzer.generateC4Diagram(repoPath, level);
    completedLevels.push(level);

    // NEW: Emit 'fresh' state after each level completes
    getStorageService().updateState(repoPath, level, 'fresh');
    getStorageService().clearChangeTracking(repoPath, level);
    broadcastToAll('c4-storage:state-changed', { repoPath, level, state: 'fresh' });

    broadcastToAll('c4-generation:progress', {
      repoPath, repoName, currentLevel: level, percent,
    });
  } catch (err) { /* ... existing error handling ... */ }
}
```

### Fix 2: C4AnalyzerService — Use Singleton Instead of Private Instance

```typescript
// Source: src/main/services/c4/c4AnalyzerService.ts (AFTER fix)

import { getStorageService } from './c4StorageHandlers'; // ADD THIS IMPORT
// REMOVE: import { C4StorageService } from './c4StorageService';

export class C4AnalyzerService {
  private staticAnalyzer: StaticAnalyzerService;
  private aiEnricher: AIEnricherService;
  private generator: C4PlantUMLGenerator;
  // REMOVE: private storage: C4StorageService;

  constructor(apiKey: string) {
    this.staticAnalyzer = new StaticAnalyzerService();
    this.aiEnricher = new AIEnricherService(apiKey);
    this.generator = new C4PlantUMLGenerator();
    // REMOVE: this.storage = new C4StorageService();
  }

  // In generateC4Diagram(), replace all this.storage.xxx with getStorageService().xxx
  // In clearRepositoryCache(), same replacement
  // In close(), remove the this.storage.close() call or make it a no-op
}
```

### Fix 3: Remove Dead diagram:stale Listener from DiagramViewer.tsx

```typescript
// Source: DiagramViewer.tsx lines 357-371 (REMOVE ENTIRE BLOCK)
// The entire useEffect block below is dead code — no main process emits 'diagram:stale' since Phase 5 Plan 07

// DELETE:
useEffect(() => {
  const handleStaleEvent = (_event: any, data: { repoPath: string; level: string }) => {
    const currentLevel = currentOptions.type.replace('c4-', '');
    if (data.level === currentLevel) {
      setIsStale(true);
    }
  };

  window.reef.ipc.on('diagram:stale', handleStaleEvent);

  return () => {
    window.reef.ipc.off('diagram:stale', handleStaleEvent);
  };
}, [currentOptions.type]);

// NOTE: Do NOT remove setIsStale — it is still used by fileWatcher.checkStaleness() at line 388
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `C4AnalyzerService` with private SQLite instance | `C4AnalyzerService` using `getStorageService()` singleton | Phase 10 (now) | Writes go through IPC-broadcasting singleton; state-changed events fire for background generation |
| `generationQueueService` only broadcasting progress/complete | Also broadcasting `generating`/`fresh` per level | Phase 10 (now) | `DiagramStateBadge` updates in real time during background generation |
| Dead `diagram:stale` listener in `DiagramViewer` | Removed | Phase 10 (now) | No spurious side effects if `diagram:stale` channel were ever re-introduced |

**Deprecated/outdated:**
- `diagram:stale` IPC channel: Replaced by `c4-storage:state-changed` in Phase 5 Plan 07. The listener in DiagramViewer.tsx is the last consumer and should be removed.
- Private `new C4StorageService()` in `C4AnalyzerService`: Pattern replaced by singleton access via `getStorageService()`.

---

## Open Questions

1. **Should `updateState('generating')` upsert or update for new rows?**
   - What we know: `C4StorageService.updateState()` runs a pure SQL `UPDATE`. If no row exists, it is a no-op.
   - What's unclear: On first-ever background generation, there is no row — the `generating` broadcast fires but the DB has no row to update. The `fresh` state fires after `storeDiagram` creates the row, so that is safe.
   - Recommendation: Accept the no-op for `generating` on first-ever generation. The IPC broadcast is what matters for the renderer; the DB row created by `storeDiagram` will have state=`fresh`. Document this in code comments. If stricter correctness is required, `storeDiagram` could be called with state=`generating` before generation and updated to `fresh` after — but that adds complexity.

2. **Should `isStale` local state be removed from DiagramViewer alongside the dead listener?**
   - What we know: `setIsStale(true)` is still called by `fileWatcher.checkStaleness()` at line 388. `isStale` is passed to `StalenessBadge` (or similar component) for display.
   - What's unclear: Whether `StalenessBadge`'s `isStale` prop path is still the correct display path, or if it should also be migrated to `diagramStateStore`.
   - Recommendation: Leave `isStale` local state and its file-watcher usage intact. Only remove the dead `diagram:stale` listener useEffect. This is a lower-risk change and matches the stated scope of Phase 10.

---

## Detailed File Map

### Files to Change

| File | Change Type | What to Change |
|------|-------------|---------------|
| `src/main/services/c4/generationQueueService.ts` | Modify | Add `updateState` + `clearChangeTracking` + `broadcastToAll('c4-storage:state-changed')` calls before and after each level's generation |
| `src/main/services/c4/c4AnalyzerService.ts` | Modify | Replace `new C4StorageService()` with `getStorageService()` singleton; remove `C4StorageService` import; make `close()` a no-op |
| `src/renderer/components/DiagramViewer/DiagramViewer.tsx` | Modify | Remove dead `diagram:stale` useEffect block (lines 357-371) |

### Files NOT to Change

| File | Reason |
|------|--------|
| `src/main/services/c4/c4StorageHandlers.ts` | Already correct — the `c4-storage:update-state` IPC handler properly broadcasts state changes |
| `src/main/services/c4/c4StorageService.ts` | No changes needed — `updateState()` and `clearChangeTracking()` methods are correct |
| `src/renderer/stores/diagramStateStore.ts` | Already subscribes to `c4-storage:state-changed` correctly — no changes |
| `src/main/preload.ts` | No new IPC channels needed |
| `src/main/main.ts` | No new handler registrations needed |

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection of `src/main/services/c4/generationQueueService.ts` — confirmed no `updateState` calls exist in the generation loop
- Direct code inspection of `src/main/services/c4/c4AnalyzerService.ts` — confirmed `this.storage = new C4StorageService()` in constructor (private instance)
- Direct code inspection of `src/renderer/components/DiagramViewer/DiagramViewer.tsx` lines 357-371 — confirmed dead `diagram:stale` listener exists
- Direct code inspection of `src/main/services/c4/c4StorageHandlers.ts` lines 52-70 — confirmed state-changed broadcast pattern
- `.planning/v1.1-MILESTONE-AUDIT.md` — authoritative gap description with file references and severity ratings

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` decisions log — confirms Phase 5 Plan 05 decision: "C4AnalyzerService creates own C4StorageService instance (WAL mode handles concurrent access from both the analyzer and IPC singleton)" — this was the original intent that Phase 10 now supersedes

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all patterns verified by direct code inspection
- Architecture: HIGH — fixes operate within established patterns already proven in renderer-initiated regeneration flow
- Pitfalls: HIGH — each pitfall derived from direct code inspection of relevant code paths
- Fix scope: HIGH — three clearly bounded changes in three files; no new abstractions required

**Research date:** 2026-02-28
**Valid until:** This research is tightly coupled to specific line numbers and code state. Valid until any of the three target files are modified.
