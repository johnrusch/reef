# Phase 9: Diagram-to-Diff Navigation - Research

**Researched:** 2026-02-28
**Domain:** Cross-tab navigation wiring, Zustand state management, React event-driven navigation
**Confidence:** HIGH

## Summary

Phase 9 adds navigation from the Visual Map (diagram) tab to the Commit Workflow (diff) tab. The core pattern is: a user clicks a changed code-level element in the diagram, the app switches to the 'commit' tab, scrolls/highlights that file in the changes panel, opens its diff, and shows a context banner. A back button returns the user to the diagram at its previous position.

The existing codebase provides all the raw infrastructure needed: `useRepositoryStore.setActiveTab()` already switches tabs, `diagramStateStore` tracks changed files with their paths, `useNavigationStore` tracks the current diagram position (stack), and `DiffViewer`/`EnhancedChangesPanel` are already wired in `CommitWorkflowTab`. No new IPC handlers or backend services are required — this phase is entirely a renderer-side state wiring problem.

The primary design challenge is **state threading**: who owns the "navigate from diagram" intent, and how does it flow from `DiagramViewer` (in the visualmap tab) through `RepositoryView` down into `CommitWorkflowTab`? The cleanest solution is a new lightweight Zustand store (or an extension to `repositoryStore`) holding a "diagram navigation intent" — the target file path and enough info to restore diagram position on back navigation.

**Primary recommendation:** Create a `useDiagramNavigationStore` Zustand slice that holds cross-tab navigation intent (target file, origin position snapshot), then wire it into `DiagramViewer` (emit), `CommitWorkflowTab` (consume + highlight), and `DiffViewer` (banner + back button).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAVG-01 | User can click stale indicator or regenerate button to update diagram with latest changes | DiagramStateBadge's stale state already calls `onRegenerate` — need to verify this is `handleRegenerateFromBadge` in DiagramViewer; regeneration flow is complete from prior phases |
| NAVG-02 | User can click on changed code-level element to navigate directly to diff viewer showing that file | `handleElementClick` in DiagramViewer already drills down; at code level it returns early — must intercept click on elements marked `data-changed` and trigger tab switch + file selection instead |
| NAVG-03 | Diff viewer shows context banner indicating navigation came from diagram | DiffViewer has no banner today; must add optional `fromDiagram?: boolean` prop and render banner conditionally |
| NAVG-04 | User can click back button in diff viewer to return to exact diagram position | navigationStore.stack already captures the full diagram position; need to snapshot it before tab switch, store in navigation intent, and call `setActiveTab('visualmap')` on back |
| NAVG-05 | Changed files are visually highlighted in changes panel when navigating from diagram | EnhancedChangesPanel has no highlight API today; must accept `highlightedFile?: string` prop and apply distinct styling to the targeted file row |
</phase_requirements>

## Standard Stack

### Core (already in project — no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | ^4 | Cross-tab navigation intent store | Already used for navigationStore, diagramStateStore, repositoryStore |
| React | 18 | UI components | Already in use |
| Tailwind CSS | ^3 | Styling for banner, highlight | Already in use |
| Lucide React | ^0.x | Back arrow icon, diagram icon | Already in use — ArrowLeft, Map available |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-resizable-panels | current | CommitWorkflowTab layout | Already used; no changes needed |
| @testing-library/react | current | Component tests | Unit tests for new props/behaviors |
| Vitest | current | Test runner | Already configured |

**Installation:** No new packages required. All dependencies are already present.

## Architecture Patterns

### Recommended Project Structure

New files for Phase 9:
```
src/renderer/stores/
└── diagramNavigationStore.ts   # NEW: cross-tab navigation intent

src/renderer/components/DiagramViewer/
└── DiagramNavigationBanner.tsx  # NEW: optional banner in DiffViewer (or inline)

tests/unit/renderer/stores/
└── diagramNavigationStore.test.ts

tests/unit/renderer/components/DiagramViewer/
└── DiagramNavigationBanner.test.tsx (or DiffViewer.navigation.test.tsx)
```

Modified files:
```
src/renderer/stores/diagramNavigationStore.ts   - new store
src/renderer/components/DiagramViewer/DiagramViewer.tsx  - emit navigation intent on code element click
src/renderer/components/DiagramViewer/DiagramPanel.tsx   - optional: click handler for changed code elements
src/renderer/components/repository/DiffViewer.tsx        - add fromDiagram banner + back button
src/renderer/components/repository/EnhancedChangesPanel.tsx - add highlightedFile prop
src/renderer/components/tabs/CommitWorkflowTab.tsx        - consume intent, pass highlight, auto-open diff
src/renderer/pages/RepositoryView.tsx                     - read intent on tab switch, trigger commit tab load
```

### Pattern 1: Zustand Intent Store (Cross-Tab Navigation)

**What:** A transient store that holds a "pending navigation intent" when the user clicks from the diagram. Consumers (CommitWorkflowTab) read it once on mount/change and clear it.

**When to use:** When two sibling components (tabs) need to communicate a one-time action without lifting state all the way to a common ancestor prop chain.

```typescript
// Source: Zustand pattern, consistent with diagramStateStore.ts
interface DiagramNavigationIntent {
  /** File path to open in diff viewer */
  targetFile: string;
  /** Snapshot of navigationStore.stack at time of click (for back navigation) */
  returnStack: NavigationLevel[];
  /** C4 level that was active */
  returnLevel: DiagramType;
  /** Timestamp to detect stale intents */
  createdAt: number;
}

interface DiagramNavigationStore {
  intent: DiagramNavigationIntent | null;
  setIntent: (intent: DiagramNavigationIntent) => void;
  clearIntent: () => void;
}

export const useDiagramNavigationStore = create<DiagramNavigationStore>()((set) => ({
  intent: null,
  setIntent: (intent) => set({ intent }),
  clearIntent: () => set({ intent: null }),
}));
```

**Why transient (no persist):** The intent is consumed once. Persisting across page reloads would produce confusing auto-navigation on app restart. Consistent with how toastStore works (ephemeral).

### Pattern 2: Code-Level Element Click Intercept (NAVG-02)

**What:** In `DiagramViewer.handleElementClick`, the current behavior at code level returns early ("Already at Code level, cannot drill down further"). Phase 9 changes this: if the element is marked changed (its ID appears in `directChangedIds` or `inheritedChangedIds`), intercept the click and navigate to the diff viewer instead.

**Lookup mechanism:** `directChangedIds` and `inheritedChangedIds` are already available in DiagramViewer as computed values from `diagramStateStore.getAffectedElements()`. The element ID from the click event maps back to `AffectedElement.elementId`. The changed file paths are in `changedFilePaths` (already computed from `diagramStateStore.getChangedFiles()`).

**File path resolution:** At code level, the `AffectedElement.elementId` is a sanitized PlantUML ID (e.g., `"reef_main"`). The actual file path is in `changedFilePaths` (already stored in diagramStateStore). The association between element ID and file path requires either:
- Option A: Take the first file in `changedFilePaths` when only one file changed (simple case)
- Option B: Store a `Map<elementId, filePath[]>` in diagramStateStore (more precise)
- **Recommendation:** Option A for the initial implementation. The `changedFiles` list stored in diagramStateStore at the code level is already filtered to files relevant to that diagram, so navigating to the first file is a reasonable default. NAVG-05 (highlight) can show all changed files in the panel.

```typescript
// In DiagramViewer.handleElementClick — after the "can't drill down" check:
if (!nextLevel) {
  // Code level: check if this element has changes
  const isChangedElement = [...directChangedIds, ...inheritedChangedIds].includes(elementId);
  if (isChangedElement && changedFilePaths.length > 0) {
    handleNavigateToDiff(changedFilePaths[0]);
  }
  return;
}
```

### Pattern 3: Tab Switch + Intent Consumption

**What:** `handleNavigateToDiff` in DiagramViewer:
1. Captures current navigationStore.stack snapshot
2. Sets diagramNavigationStore.setIntent({ targetFile, returnStack, returnLevel, createdAt })
3. Calls `useRepositoryStore.getState().setActiveTab('commit')`

**Note:** DiagramViewer doesn't have direct access to `setActiveTab` today (it's owned by RepositoryView). Two options:
- Option A: DiagramViewer gets an `onNavigateToDiff` callback prop from VisualMapTab/RepositoryView (prop drilling, explicit)
- Option B: DiagramViewer calls `useRepositoryStore.getState().setActiveTab('commit')` directly from the store (store coupling, but stores calling other stores is already the pattern — see diagramStateStore calling useDiagramStateStore.getState() in DiagramViewer)
- **Recommendation:** Option B. The store is already globally accessible and the project pattern is to call `.getState()` inside callbacks to avoid re-subscriptions (see Phase 06-03 and 07-02 decisions).

### Pattern 4: CommitWorkflowTab Intent Consumption

**What:** CommitWorkflowTab reads the diagramNavigationStore intent in a `useEffect` triggered by intent changes. When intent is present:
1. Auto-calls `handleViewDiff(intent.targetFile)` to load the diff
2. Passes `intent.targetFile` as `highlightedFile` to EnhancedChangesPanel
3. Clears the intent (consume-once pattern)

```typescript
// In CommitWorkflowTab:
const intent = useDiagramNavigationStore(s => s.intent);
const clearIntent = useDiagramNavigationStore(s => s.clearIntent);

useEffect(() => {
  if (!intent) return;
  // Auto-open the diff for the target file
  void handleViewDiff(intent.targetFile);
  clearIntent();
}, [intent]);
```

**Stale intent protection:** The `createdAt` timestamp lets CommitWorkflowTab ignore intents older than a threshold (e.g., 5 seconds), preventing confusing navigation if the user manually switches tabs and back.

### Pattern 5: DiffViewer Banner + Back Button (NAVG-03, NAVG-04)

**What:** DiffViewer gets an optional `fromDiagram?: boolean` prop and `onBackToDiagram?: () => void` prop. When `fromDiagram` is true, render a context banner in the header:

```tsx
{fromDiagram && onBackToDiagram && (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border-b border-blue-500/20 text-xs text-blue-300">
    <Map className="w-3 h-3" />
    <span>Navigated from Visual Map</span>
    <button onClick={onBackToDiagram} className="ml-auto flex items-center gap-1 hover:text-white">
      <ArrowLeft className="w-3 h-3" />
      Back to diagram
    </button>
  </div>
)}
```

The `onBackToDiagram` callback in CommitWorkflowTab:
1. Reads `returnStack` and `returnLevel` from the stored returnSnapshot (must retain it even after clearing intent)
2. Calls `useNavigationStore.getState()` and restores the stack
3. Calls `useRepositoryStore.getState().setActiveTab('visualmap')`

**Return snapshot retention:** After clearing the intent (on consume), CommitWorkflowTab keeps a local `useState<DiagramNavigationReturn | null>` for the "back" capability. When user clicks back, it uses that local state and resets it to null.

### Pattern 6: EnhancedChangesPanel File Highlighting (NAVG-05)

**What:** Add `highlightedFile?: string` prop to EnhancedChangesPanel. In `renderFileItem`, apply amber/blue highlight styling to the row matching `highlightedFile`.

```tsx
// In renderFileItem:
const isHighlighted = file.path === highlightedFile;
<div className={`flex items-center ... ${isHighlighted ? 'bg-amber-500/10 border border-amber-500/30' : ''}`}>
```

**Auto-scroll:** The highlighted file should scroll into view. Use `useRef` and `useEffect` in EnhancedChangesPanel to scroll the highlighted row into view when `highlightedFile` changes.

### Anti-Patterns to Avoid

- **Prop drilling the intent through RepositoryView:** Avoid passing `diagramIntent` as a prop through RepositoryView → CommitWorkflowTab → DiffViewer. Use the Zustand store directly — it's the established pattern.
- **Persisting the navigation intent:** Don't persist to localStorage. Intents should not survive app restart.
- **Modifying navigationStore to add cross-tab state:** navigationStore is diagram-internal. Cross-tab state belongs in a dedicated store.
- **Re-rendering on every intent poll:** Use `useDiagramNavigationStore(s => s.intent)` selector so only intent changes trigger re-renders, not unrelated store updates.
- **Clearing intent before consuming it:** Always consume (call handleViewDiff, capture returnStack) BEFORE calling clearIntent().

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-component one-shot event | Custom EventEmitter / window.dispatchEvent | Zustand intent store | Already the project pattern; no cleanup needed; SSR-safe |
| Animated tab transition | CSS keyframes from scratch | Tailwind transition classes | Consistent with existing UI patterns |
| File highlight scroll | Scroll library | `element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` | Native API is sufficient and zero-cost |

**Key insight:** The entire feature is store wiring + UI additions. There are no new services, IPC handlers, or backend changes needed.

## Common Pitfalls

### Pitfall 1: Intent Consumed Before Tab Mount
**What goes wrong:** DiagramViewer sets intent and switches tab. If CommitWorkflowTab was already mounted (React keeps it mounted for performance), the useEffect fires immediately. If it wasn't mounted yet, the intent must survive until mount. Zustand stores persist for the app lifetime, so this is fine — but the stale intent detection (createdAt check) is important if the user quickly navigates away.
**How to avoid:** Add `createdAt` to intent and check in CommitWorkflowTab useEffect: ignore if `Date.now() - intent.createdAt > 5000`.

### Pitfall 2: `handleElementClick` at Code Level Needs Changed-File Association
**What goes wrong:** The elementId from PlantUMLRenderer's click event is a sanitized PlantUML group ID (e.g., `"reef_services_gitService"`). The changedFilePaths array contains file paths. There's no guaranteed direct mapping between one and the other in the current store structure.
**Why it happens:** ChangeTrackingService maps files to element IDs, but the reverse (element ID → specific files) is not stored separately. `changedFilePaths` is a flat array for the whole level.
**How to avoid:** For code-level elements, the changedFilePaths array is already filtered to files relevant to that code diagram. A reasonable approach: when the user clicks a changed element, open the first changed file in the list. Alternatively, filter `affectedElements` to find the clicked elementId and use the associated files. However, AffectedElement doesn't currently store which specific files caused it — only the element ID and isDirect flag. The safest implementation: navigate to the diff viewer and highlight all changed files in the changes panel (NAVG-05), letting the user pick the specific file.
**Warning signs:** If the mapping produces wrong files, check whether `getChangedFiles()` is being called with the correct level and repoPath.

### Pitfall 3: Tab Switch Before Intent Is Set
**What goes wrong:** If `setActiveTab('commit')` is called before `setIntent()`, CommitWorkflowTab mounts and sees no intent.
**How to avoid:** Always call `setIntent()` before `setActiveTab()`. Both are synchronous Zustand operations, so order matters.

### Pitfall 4: Back Navigation Restores Wrong Diagram Position
**What goes wrong:** The user drills down to code level, clicks a changed element, navigates to diff, then clicks back. The diagram should return to code level at the same element — but navigationStore.stack has a specific structure.
**How to avoid:** Snapshot `navigationStore.stack` and `currentOptions.type` from DiagramViewer at the time of the click. Store both in the intent as `returnStack` and `returnLevel`. On back: call `navigationStore.navigateTo(returnStack.length - 1)` after restoring the stack, then trigger diagram reload.
**Warning signs:** If the diagram resets to context level on back, the stack wasn't restored before `navigateTo()` was called.

### Pitfall 5: NAVG-01 is Already 90% Done
**What goes wrong:** NAVG-01 says "User can click stale indicator or regenerate button to update diagram." This already works via DiagramStateBadge's `onRegenerate` callback wired to `handleRegenerateFromBadge` in DiagramViewer. The StalenessBadge is also wired. The only gap to verify: does regeneration actually clear the stale state and re-render fresh? Based on Phase 5-8 decisions, yes — `updateState('fresh')` triggers the state pipeline.
**How to avoid:** Treat NAVG-01 as a verification task, not an implementation task. Write a test that asserts the stale badge click calls regeneration.

### Pitfall 6: CommitWorkflowTab's `handleViewDiff` is Async
**What goes wrong:** When CommitWorkflowTab receives the intent and calls `handleViewDiff(file)`, it's async (calls `onViewDiff` which calls `window.reef.git.diff`). The highlighted file in the changes panel should appear immediately (synchronously from highlightedFile prop), but the diff content takes time to load.
**How to avoid:** Set `highlightedFile` from the intent immediately (synchronous), and separately trigger `handleViewDiff` (async). These are independent operations. The panel highlights first, then the diff loads.

## Code Examples

### DiagramNavigationStore
```typescript
// Source: Pattern derived from diagramStateStore.ts and toastStore.ts
import { create } from 'zustand';
import type { NavigationLevel } from './navigationStore';
import type { DiagramType } from '../components/DiagramViewer/DiagramViewer';

interface DiagramNavigationReturn {
  returnStack: NavigationLevel[];
  returnLevel: DiagramType;
}

interface DiagramNavigationIntent extends DiagramNavigationReturn {
  targetFile: string;
  createdAt: number;
}

interface DiagramNavigationStore {
  intent: DiagramNavigationIntent | null;
  setIntent: (intent: DiagramNavigationIntent) => void;
  clearIntent: () => void;
}

export const useDiagramNavigationStore = create<DiagramNavigationStore>()((set) => ({
  intent: null,
  setIntent: (intent) => set({ intent }),
  clearIntent: () => set({ intent: null }),
}));
```

### DiagramViewer: handleNavigateToDiff
```typescript
// In DiagramViewer.tsx — new handler
const handleNavigateToDiff = useCallback((filePath: string) => {
  const { setIntent } = useDiagramNavigationStore.getState();
  const { setActiveTab } = useRepositoryStore.getState();

  // Snapshot current diagram position for back navigation
  setIntent({
    targetFile: filePath,
    returnStack: [...navigationStore.stack],
    returnLevel: currentOptions.type,
    createdAt: Date.now(),
  });

  // Switch tab after intent is set
  setActiveTab('commit');
}, [navigationStore.stack, currentOptions.type]);
```

### CommitWorkflowTab: intent consumption
```typescript
// In CommitWorkflowTab.tsx — add near top of component
const intent = useDiagramNavigationStore(s => s.intent);
const clearIntent = useDiagramNavigationStore(s => s.clearIntent);
const [diagramReturn, setDiagramReturn] = useState<DiagramNavigationReturn | null>(null);

useEffect(() => {
  if (!intent) return;
  // Guard against stale intents
  if (Date.now() - intent.createdAt > 5000) {
    clearIntent();
    return;
  }
  // Capture return info before clearing
  setDiagramReturn({ returnStack: intent.returnStack, returnLevel: intent.returnLevel });
  setHighlightedFile(intent.targetFile);
  void handleViewDiff(intent.targetFile);
  clearIntent();
}, [intent]);

const handleBackToDiagram = useCallback(() => {
  if (!diagramReturn) return;
  const navStore = useNavigationStore.getState();
  const repoStore = useRepositoryStore.getState();
  // Restore stack by navigating to end of return stack
  // (NavigationStore doesn't have a "restore" action yet — may need one)
  repoStore.setActiveTab('visualmap');
  setDiagramReturn(null);
  setHighlightedFile(null);
}, [diagramReturn]);
```

### EnhancedChangesPanel: highlightedFile prop
```typescript
// Addition to interface
interface EnhancedChangesPanelProps {
  // ... existing props ...
  highlightedFile?: string;  // NEW
}

// In renderFileItem:
const isHighlighted = file.path === highlightedFile ||
                      file.path.endsWith('/' + highlightedFile) ||
                      highlightedFile?.endsWith('/' + file.path.split('/').pop()!);
```

### NavigationStore: restoreStack (may need addition)
```typescript
// Needed for back navigation to restore exact position
// Option: add to navigationStore:
restoreStack: (stack: NavigationLevel[]) => {
  set({ stack: [...stack] });
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Router for cross-view navigation | Zustand store intent pattern | Already established in this codebase | No router dependency; works within Electron single-window |
| Prop drilling for cross-tab state | Global Zustand store | Already established (Phase 5+) | Clean, no parent changes needed |

## Open Questions

1. **File path matching in EnhancedChangesPanel vs. changedFilePaths format**
   - What we know: `changedFiles` in diagramStateStore stores paths as returned by ChangeTrackingService (likely relative to repo root, e.g., `"src/main/services/gitService.ts"`)
   - What we know: gitStatus files in CommitWorkflowTab use the same relative paths
   - What's unclear: Do they always match exactly? Are they normalized to forward slashes on Windows?
   - Recommendation: Normalize to forward slashes in the matching logic. The `generateKey` pattern in diagramStateStore already does `repoPath.replace(/\\/g, '/')`.

2. **Back navigation stack restoration**
   - What we know: navigationStore has `navigateTo(index)` which truncates the stack. It does NOT have a `restoreStack` action.
   - What's unclear: Should restoring the full stack also trigger a diagram reload? The user expects to see the diagram at the position they left.
   - Recommendation: Add `restoreStack(stack: NavigationLevel[])` to navigationStore, then trigger diagram reload (re-call `onRegenerateDiagram`) with the restored position. This needs to happen in VisualMapTab or DiagramViewer on mount when the tab is switched back.

3. **NAVG-01 scope: is it truly already done?**
   - What we know: DiagramStateBadge's stale state has a clickable `onRegenerate` button. DiagramViewer wires it to `handleRegenerateFromBadge`. StalenessBadge also wires to the same handler.
   - What's unclear: The requirement says "stale indicator OR regenerate button" — there appear to be two UI elements (StalenessBadge and DiagramStateBadge in stale state) that both do this. This may already satisfy NAVG-01 without new code.
   - Recommendation: Treat NAVG-01 as a verification-only task. Write a test asserting the behavior exists; add no new code unless the test fails.

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` — skipping this section.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src/renderer/stores/navigationStore.ts`, `diagramStateStore.ts`, `repositoryStore.ts`
- Direct codebase inspection — `src/renderer/components/DiagramViewer/DiagramViewer.tsx`, `DiagramPanel.tsx`, `ChangeBadge.tsx`, `DiagramStateBadge.tsx`, `StalenessBadge.tsx`
- Direct codebase inspection — `src/renderer/components/repository/DiffViewer.tsx`, `EnhancedChangesPanel.tsx`, `CommitWorkflowTab.tsx`, `RepositoryTabs.tsx`
- Direct codebase inspection — `src/renderer/pages/RepositoryView.tsx`, `src/renderer/components/tabs/VisualMapTab.tsx`
- Direct codebase inspection — `src/main/preload.ts` (ReefAPI interface)
- Direct codebase inspection — `src/shared/types/changeTracking.ts`
- `.planning/STATE.md` — decisions from Phases 5-8, especially pattern for `useStore.getState()` in callbacks

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — requirement descriptions for NAVG-01 through NAVG-05
- `.planning/INTEGRATION-CHECK.md` — existing flow verification confirming IPC and store wiring patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json and existing imports
- Architecture: HIGH — all patterns derived from existing code in the same codebase; no external library guesswork
- Pitfalls: HIGH — derived from careful reading of existing component contracts and Phase 5-8 decisions

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable React/Zustand patterns, short-lived only if major component refactors happen)
