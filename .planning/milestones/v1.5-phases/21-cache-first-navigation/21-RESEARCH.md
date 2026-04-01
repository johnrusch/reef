# Phase 21: Cache-First Navigation - Research

**Researched:** 2026-03-28
**Domain:** Electron IPC + React/Zustand state management + C4 diagram navigation
**Confidence:** HIGH

## Summary

Phase 21 fixes a confirmed regression where every navigation action — breadcrumb clicks, element (drill-down) clicks, and sidebar level clicks — unconditionally calls the AI generation pipeline instead of reading from cache. This was documented in `.planning/v1.5-findings.md` as Bug #1 and Bug #2 after manual acceptance testing of v1.4 with `test-repos/sample-app`.

The root cause is clear from the source: every navigation handler in `DiagramViewer.tsx` (`handleBreadcrumbNavigate`, `handleTreeNavigate`, `handleElementClick`, `handleCommandPaletteNavigate`) calls `onRegenerateDiagram(...)` unconditionally — the same function used for explicit regeneration. The `generateDiagram` function in `VisualMapTab.tsx` does have a cache-check path (lines 254–316) guarded by `!options?.skipCache`, but navigation calls never pass `skipCache: true` — yet the behavior is still broken because `handleBreadcrumbNavigate` and `handleTreeNavigate` call `onRegenerateDiagram` with no `skipCache` flag, which *should* hit cache. The real failure is that state changes (`setDiagramType`, `setElementId`) cause the `loadPersistedDiagram` effect (lines 54–127) to fire *after* `generateDiagram` already began, causing a race and over-generation.

Three separate fixes are required: (1) refactor navigation handlers to call a load-only path instead of the generate path, (2) extend `generateAllDiagrams` to cover all 4 C4 levels including component/code, and (3) update the `GeneratePromptCard` copy to match the UI spec.

**Primary recommendation:** Create a dedicated `loadDiagram(level, elementId)` function in `VisualMapTab.tsx` that reads SVG from LRU/SQLite and reads `.reef/` via the import IPC handler — this function is called by all navigation handlers. `generateDiagram` is called only when cache misses occur or when `skipCache: true` is explicitly set.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | User can navigate between diagram levels (sidebar, breadcrumb, element click) and see cached diagrams instantly without triggering regeneration | Cache-first load path: `c4-storage:get-svg` IPC (LRU then SQLite), `reef-import:scan-and-import` for .reef/ fallback. Three navigation handlers in `DiagramViewer.tsx` need to route through load-only function. |
| NAV-02 | User's .reef/ diagrams are preserved during navigation — .reef/ only updated on explicit Regenerate action | `.reef/` writes happen only in `writeReefArtifacts()` which is called only from `c4-storage:store-svg` IPC handler. Navigation refactor must never call `store-svg` — it only calls `get-svg`. |
| NAV-03 | User can click "Generate All" and all 4 C4 levels (context, container, component, code) are generated upfront | `generateAllDiagrams()` in `VisualMapTab.tsx` currently only generates context+container. Component requires a container elementId; code requires a component elementId. The `generationQueueService.ts` already generates all 4 via `c4-generation:enqueue` IPC — reusing it is the correct path. |
</phase_requirements>

---

## Standard Stack

### Core (all already in-project, no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | ^4.x (project) | Renderer state (`diagramStateStore`, `diagramNavigationStore`) | Already the project store layer |
| Electron IPC | Electron 28 | `window.reef.c4Storage.getSvg`, `getDiagram`, `getRepoStates` | The only process bridge available |
| React hooks | React 18 | `useCallback`, `useEffect` for load side effects | Project standard |
| better-sqlite3 | ^8.x (project) | `C4StorageService.getDiagram`, `getSvg` | Existing persistence layer |

### No New Libraries Required

This phase is a pure behavioural fix — refactoring control flow in two files (`DiagramViewer.tsx` and `VisualMapTab.tsx`) plus minor copy updates to `GeneratePromptCard.tsx` and `DiagramControls.tsx`. No new npm packages are needed.

## Architecture Patterns

### Recommended Project Structure

No new files needed. Changes are confined to:

```
src/renderer/components/
├── DiagramViewer/
│   ├── DiagramViewer.tsx     ← Navigation handler refactor (NAV-01, NAV-02)
│   ├── DiagramControls.tsx   ← Add "Generate All" button (NAV-03 UI)
│   └── GeneratePromptCard.tsx  ← Copy + body text update per UI spec
└── tabs/
    └── VisualMapTab.tsx      ← Add loadDiagram(), fix generateAllDiagrams() (NAV-01, NAV-02, NAV-03)
```

### Pattern 1: Cache-First Load Function

A new `loadDiagram(level, elementId)` function in `VisualMapTab.tsx` mirrors the existing cache-check logic from `generateDiagram` (lines 254–316) but **never** falls through to AI generation. It returns a boolean: `true` if cache was hit, `false` if cache missed (caller shows GeneratePromptCard).

```typescript
// VisualMapTab.tsx — new function (NAV-01, NAV-02)
const loadDiagram = useCallback(async (
  type: DiagramType,
  newElementId?: string
): Promise<boolean> => {
  const level = type.replace('c4-', '');

  // 1. SVG cache (LRU → SQLite) — fastest path
  const cachedSvg = await window.reef.c4Storage.getSvg(
    repository.path,
    level,
    newElementId
  );
  if (cachedSvg) {
    setSvgContent(cachedSvg);
    setDiagram('');
    setDiagramType(type);
    setElementId(newElementId);
    setMetadata({ /* cached metadata */ });
    setIsGenerating(false);
    return true;
  }

  // 2. PlantUML source fallback (SQLite only)
  const storedDiagram = await window.reef.c4Storage.getDiagram(
    repository.path,
    level,
    newElementId
  );
  if (storedDiagram) {
    setSvgContent('');
    setDiagram(storedDiagram.diagramContent);
    setDiagramType(type);
    setElementId(newElementId);
    setMetadata({ /* from stored */ });
    setIsGenerating(false);
    return true;
  }

  // 3. Cache miss — caller decides whether to generate
  return false;
}, [repository, setDiagramType, setElementId]);
```

**Key invariant:** `loadDiagram` NEVER calls `window.reef.c4Storage.updateState` with `'generating'` and NEVER calls `window.reef.diagram.generate`. It is read-only.

### Pattern 2: Navigation Handlers Refactored to Use loadDiagram

All navigation handlers in `DiagramViewer.tsx` currently call `onRegenerateDiagram(...)`. They must instead call a new `onLoadDiagram` prop. `VisualMapTab.tsx` supplies `loadDiagram` as `onLoadDiagram`.

```typescript
// DiagramViewer.tsx — handleElementClick refactored (NAV-01)
const handleElementClick = useCallback(async (elementId: string) => {
  if (isGenerating || !currentOptions.type.startsWith('c4-')) return;
  const nextLevel = getNextLevel(navigationStore.currentLevel().level);
  if (!nextLevel) { /* code-level click: handle diff navigation */ return; }

  navigationStore.push({ level: nextLevel, elementId, elementName });
  const newType = `c4-${nextLevel}` as DiagramType;
  handleControlChange({ type: newType });

  const hit = await onLoadDiagram({ type: newType, elementId });
  if (!hit) {
    // Cache miss: fall through to generate (first-time drill-down only)
    await onRegenerateDiagram({ ...currentOptions, type: newType, elementId });
  }
}, [...]);
```

```typescript
// DiagramViewer.tsx — handleBreadcrumbNavigate refactored (NAV-01)
const handleBreadcrumbNavigate = useCallback(async (index: number) => {
  const targetLevel = navigationStore.stack[index];
  navigationStore.navigateTo(index);
  const newType = `c4-${targetLevel.level}` as DiagramType;
  handleControlChange({ type: newType });

  // NAV-01: always try cache first, never regenerate on breadcrumb
  await onLoadDiagram({ type: newType, elementId: targetLevel.elementId });
  // No fallback to generate — breadcrumb can only navigate to already-seen levels
}, [...]);
```

```typescript
// DiagramViewer.tsx — handleTreeNavigate refactored (NAV-01)
const handleTreeNavigate = useCallback(async (level: 'context' | 'container' | 'component' | 'code') => {
  // ... navigation stack logic unchanged ...
  const hit = await onLoadDiagram({ type: newType, elementId: targetElementId });
  // context/container: no fallback (must exist if sidebar shows them)
  // component/code: if miss, show GeneratePromptCard (user must drill-down first)
}, [...]);
```

### Pattern 3: Generate All Covers 4 Levels via generationQueueService

The `generateAllDiagrams` function currently calls `window.reef.diagram.generate` directly for each level in a manual loop (lines 463–480 in `VisualMapTab.tsx`). The component/code levels require `elementId` which is unavailable at "Generate All" time.

The correct approach: use the existing `c4-generation:enqueue` IPC which already loops all 4 levels in `generationQueueService.ts` (lines 72–127). This service generates context, then container, then uses the container's element registry to produce component diagrams for every discovered container, and code diagrams for every component.

```typescript
// VisualMapTab.tsx — generateAllDiagrams replacement (NAV-03)
const generateAllDiagrams = async () => {
  if (!repository) return;
  setIsGenerating(true);
  setError(null);

  // Delegate to generationQueueService — handles all 4 levels sequentially
  // including component/code elementId discovery from static analysis
  await window.reef.c4Generation.enqueue(repository.path, repository.name);
  // Progress and completion via c4-generation:progress / c4-generation:complete events
};
```

The renderer must also subscribe to `c4-generation:complete` to call `loadDiagram('c4-context')` after completion, and `c4-generation:progress` to drive the generating indicator.

**Important:** Check if `window.reef.c4Generation` IPC binding exists in the preload script. If not, Wave 0 must add it.

### Pattern 4: DiagramControls "Generate All" Button

Per the UI spec: add "Generate All" button to `DiagramControls.tsx` toolbar, visible only when `showGenerateAll` prop is true (controlled by parent when `currentState === 'never_generated'`).

```typescript
// DiagramControls.tsx — new props + button (NAV-03 UI)
interface DiagramControlsProps {
  // ... existing ...
  showGenerateAll?: boolean;
  onGenerateAll?: () => void;
}
// In render: left of "Regenerate", blue accent, Sparkles icon
```

### Anti-Patterns to Avoid

- **Calling onRegenerateDiagram from breadcrumb/sidebar without skipCache check:** The existing code does this. Navigation must route through `onLoadDiagram`, not `onRegenerateDiagram`.
- **Setting `setDiagramType`/`setElementId` state before awaiting cache load:** This triggers the `loadPersistedDiagram` useEffect (lines 54–127 in `VisualMapTab.tsx`) to fire concurrently with the explicit load call. State updates should happen *after* load confirms a result, not before.
- **Using the generationQueueService for single-level regenerate:** That service generates all 4 levels. The explicit "Regenerate" button should continue calling `window.reef.diagram.generate` for only the current level.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| All-4-levels generation | Manual loop over `window.reef.diagram.generate` per level | `c4-generation:enqueue` IPC → `generationQueueService.ts` | Already handles elementId discovery, state broadcasting, error recovery, and cancellation |
| SVG cache lookup | Custom fetch logic | `window.reef.c4Storage.getSvg` (LRU → SQLite fallback built in) | Includes LRU promotion — reinventing this misses the hot-cache benefit |
| .reef/ import on miss | Direct file reads in renderer | `reef-import:scan-and-import` IPC | Already handles schema validation, all flat levels, error isolation |

**Key insight:** The backend IPC surface is complete. All required read and generate operations already exist. Phase 21 work is entirely in the renderer — routing navigation calls to the correct IPC endpoint.

## Common Pitfalls

### Pitfall 1: State-Setter Race Causing Double Load

**What goes wrong:** If `setDiagramType(newType)` is called before `loadDiagram` resolves, the `loadPersistedDiagram` `useEffect` in `VisualMapTab.tsx` fires with `[repository, diagramType, elementId, loadStatesFromBackend]` as dependencies — triggering a second concurrent load. If both complete, the second one may overwrite the first's UI state with stale data.

**Why it happens:** React batches state updates but `useEffect` dependencies fire after the next render cycle. Calling `setDiagramType` mid-navigation means the effect re-runs while `loadDiagram` is still awaiting IPC.

**How to avoid:** Set `diagramType` and `elementId` state only after `loadDiagram` returns, inside the callback. Better yet, remove `diagramType` and `elementId` from the `loadPersistedDiagram` effect dependencies if navigation is entirely controlled by explicit calls.

**Warning signs:** Console showing two `getSvg` IPC calls for the same level in rapid succession, or diagram flickering.

### Pitfall 2: generationQueueService Generates All 4 Levels Without Element Discovery Context

**What goes wrong:** The `c4-generation:enqueue` handler calls `analyzer.generateC4Diagram(repoPath, level)` without an elementId for component/code levels. However, the `C4AnalyzerService` requires `elementId` for component and code levels (see `c4AnalyzerService.ts` lines 202–221: `throw new Error('Component diagram requires elementId')`).

**Why it happens:** Looking at `generationQueueService.ts` lines 72–127, it loops over all 4 `C4_LEVELS` and calls `analyzer.generateC4Diagram(repoPath, level)` with no elementId. The service relies on `C4AnalyzerService` discovering element IDs internally during static analysis.

**How to avoid:** Before wiring "Generate All" to `c4-generation:enqueue`, verify that the enqueue handler actually succeeds for component and code levels in a test repo. Check whether `C4AnalyzerService` has logic for elementId auto-discovery when none is provided. If not, the enqueue handler may need to be updated, or "Generate All" may need a different approach (e.g., generating context+container only via enqueue, then discovering container element IDs from the generated diagram before generating components).

**Warning signs:** The `c4-generation:complete` event fires with `completedLevels: ['context', 'container']` and an error for `component`.

### Pitfall 3: .reef/ LRU Cache Key Mismatch

**What goes wrong:** The LRU cache key format must match exactly between the write path (`c4StorageHandlers.ts` line 186: `[repoPath, level, elementId ?? ''].join(':')`) and the read path. If `loadDiagram` calls `getSvg` with `elementId = undefined`, the LRU key is `${repoPath}:${level}:` (trailing colon). If any code writes with `elementId = ''`, the key is the same. But if written with no elementId at all (null stored), the key format may differ.

**How to avoid:** Always pass `undefined` (not `null` or `''`) for flat-level diagrams when calling `getSvg`. The IPC handler normalizes: `elementId ?? null` on the backend, and the LRU key uses `elementId ?? ''` on the key string. These are consistent as long as the renderer uses `undefined` consistently.

### Pitfall 4: Breadcrumb Navigation Allows Navigating to Never-Generated Levels

**What goes wrong:** The breadcrumb shows only levels already in the navigation stack (levels the user has visited). However, the sidebar may show all 4 C4 levels. If the user clicks "Component" in the sidebar without having drilled down to a specific container first, `handleTreeNavigate` should not attempt to load a component diagram (no elementId is known).

**How to avoid:** `handleTreeNavigate` must keep the existing guard: `if (level === 'component' || level === 'code') { return; }` when there is no elementId in the stack for that level. This guard exists in the current code (lines 218–221 in `DiagramViewer.tsx`) and must be preserved in the refactor.

### Pitfall 5: `loadPersistedDiagram` useEffect Redundancy After Refactor

**What goes wrong:** After refactoring navigation to use `loadDiagram`, the `loadPersistedDiagram` useEffect (VisualMapTab.tsx lines 54–127) is still triggered by `diagramType`/`elementId` changes. This means every navigation call both: (a) calls `loadDiagram` explicitly, and (b) triggers the effect. The effect will run a second `getSvg`/`getDiagram` call after the explicit load already populated state.

**How to avoid:** Either (a) make `loadDiagram` set state such that the effect's `if (!repository) return` or an explicit guard short-circuits it, or (b) remove `diagramType` and `elementId` from the effect's dependency array and trigger loading only through explicit calls. Option (b) is cleaner but requires care to preserve the on-mount load behavior.

## Code Examples

### Existing: handleElementClick (current broken behavior)

```typescript
// DiagramViewer.tsx lines 266–280 — unconditionally calls onRegenerateDiagram
const handleElementClick = useCallback(async (elementId: string) => {
  // ...
  try {
    await onRegenerateDiagram({        // <--- BUG: always generates
      ...currentOptions,
      type: newType,
      elementId: elementId,
    });
  } catch (error) {
    navigationStore.pop();
  }
}, [...]);
```

### Existing: generateDiagram cache-check guard (working pattern to preserve)

```typescript
// VisualMapTab.tsx lines 253–316 — this IS the cache path, called when skipCache is falsy
if (!options?.skipCache) {
  const cachedSvg = await window.reef.c4Storage.getSvg(repo, level, finalElementId);
  if (cachedSvg) {
    setSvgContent(cachedSvg);
    setIsGenerating(false);
    return;               // <--- exits without generating
  }
  const storedDiagram = await window.reef.c4Storage.getDiagram(repo, level, finalElementId);
  if (storedDiagram) {
    setDiagram(storedDiagram.diagramContent);
    setIsGenerating(false);
    return;               // <--- exits without generating
  }
}
// Only reaches here on true cache miss or skipCache=true
```

### Existing: generateAllDiagrams (current incomplete behavior)

```typescript
// VisualMapTab.tsx lines 437–520 — only generates context + container
const levels = [
  { type: 'c4-context', level: 'context' },
  { type: 'c4-container', level: 'container' },
  // component and code are MISSING
];
```

### IPC surface for "Generate All" delegation

```typescript
// preload.ts (check if this binding exists before using)
window.reef.c4Generation.enqueue(repoPath, repoName)
// IPC channel: 'c4-generation:enqueue'
// Progress events: 'c4-generation:progress', 'c4-generation:complete'
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LRU-only cache | `.reef/` → LRU → SQLite priority | v1.4 (Phase 17–20) | `.reef/` is now authoritative; SQLite + LRU are hot cache only |
| TTL-based cache | No-TTL persistent storage | v1.1 | Diagrams survive app restart |
| Manual loop for all-levels | `c4-generation:enqueue` queue | v1.4 | Handles all 4 levels with progress events |
| SVG rendered at display time | Pre-rendered SVG stored in SQLite `svg_content` | v1.3/v1.4 PERF-01 | Navigation can show cached SVG without re-rendering PlantUML |

**Deprecated/outdated:**
- The `cacheService.ts` (TTL-based SQLite in `userData/cache/`): replaced by `c4StorageService.ts` in `userData/diagrams/`. Still present in codebase but not used by the navigation path.

## Open Questions

1. **Does `c4-generation:enqueue` successfully generate component/code levels without an explicit elementId?**
   - What we know: `generationQueueService.ts` loops all 4 `C4_LEVELS` calling `analyzer.generateC4Diagram(repoPath, level)` with no elementId. `C4AnalyzerService` throws if `elementId` is missing for component/code (lines 203, 218).
   - What's unclear: Whether the existing enqueue path has been tested for component/code levels, or whether it relies on the analyzer handling a missing elementId gracefully.
   - Recommendation: Trace `generateC4Diagram` for the component level with no elementId. If it throws, the "Generate All" implementation must either (a) update `generationQueueService.ts` to auto-discover elementIds from the previously generated container diagram, or (b) limit "Generate All" to context+container in the button but document this as a known limitation to be revisited in Phase 23.

2. **Is `window.reef.c4Generation` exposed in the preload script?**
   - What we know: The IPC handler `c4-generation:enqueue` is registered in `generationQueueService.ts`. The preload API (`window.reef.*`) is defined in `src/main/preload.ts`.
   - What's unclear: Whether the `c4Generation` namespace is present on the preload object.
   - Recommendation: Wave 0 task should check `src/main/preload.ts` for `c4Generation` binding. If absent, Wave 0 adds it.

## Environment Availability

Step 2.6: SKIPPED — phase is pure renderer-side code changes with no new external dependencies. All required runtime services (SQLite via `better-sqlite3`, IPC handlers, LRU cache) are already registered and operational.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 1.x + @testing-library/react |
| Config file | `/Users/johnrusch/Code/reef/vitest.config.ts` |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | Breadcrumb click calls loadDiagram, not generateDiagram | unit | `npx vitest run tests/unit/renderer/components/DiagramViewer/NavigationDrillDown.test.tsx` | Exists (may need update) |
| NAV-01 | Element click calls loadDiagram, not generateDiagram | unit | `npx vitest run tests/unit/renderer/components/tabs/VisualMapTab.test.tsx` | Exists (may need update) |
| NAV-01 | Sidebar click calls loadDiagram, not generateDiagram | unit | `npx vitest run tests/unit/renderer/components/DiagramViewer/C4HierarchyTree.test.tsx` | Exists |
| NAV-02 | loadDiagram never calls store-svg or update-state | unit | `npx vitest run tests/unit/renderer/components/tabs/VisualMapTab.test.tsx` | Exists (may need update) |
| NAV-02 | c4Storage.storeSvg is NOT called during navigation | unit | `npx vitest run tests/unit/renderer/components/tabs/VisualMapTab.gen01.test.tsx` | Exists |
| NAV-03 | generateAllDiagrams calls c4-generation:enqueue (or covers all 4 levels) | unit | `npx vitest run tests/unit/renderer/components/tabs/VisualMapTab.test.tsx` | Exists (needs update) |
| NAV-03 | "Generate All" button renders when currentState === 'never_generated' | unit | `npx vitest run tests/unit/renderer/components/DiagramViewer/DiagramControls.test.tsx` | Exists (needs update) |

### Sampling Rate

- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] Verify `src/main/preload.ts` exposes `window.reef.c4Generation.enqueue` — add if missing
- [ ] Existing `NavigationDrillDown.test.tsx` — check if it mocks `onRegenerateDiagram` and verify tests cover the new `onLoadDiagram` prop
- [ ] Existing `VisualMapTab.test.tsx` — check if it covers the `loadDiagram` cache-hit path (it likely tests only generation)

## Sources

### Primary (HIGH confidence)

- `/Users/johnrusch/Code/reef/src/renderer/components/tabs/VisualMapTab.tsx` — `generateDiagram` function lines 214–435, `generateAllDiagrams` lines 437–520
- `/Users/johnrusch/Code/reef/src/renderer/components/DiagramViewer/DiagramViewer.tsx` — all navigation handlers
- `/Users/johnrusch/Code/reef/src/main/services/c4/generationQueueService.ts` — `c4-generation:enqueue` all-4-levels loop
- `/Users/johnrusch/Code/reef/src/main/services/c4/c4StorageHandlers.ts` — `c4-storage:get-svg` LRU+SQLite pattern
- `/Users/johnrusch/Code/reef/.planning/v1.5-findings.md` — confirmed bug descriptions from manual testing

### Secondary (MEDIUM confidence)

- `/Users/johnrusch/Code/reef/src/main/services/c4/c4AnalyzerService.ts` — elementId requirement for component/code levels (raises Open Question 1)
- `/Users/johnrusch/Code/reef/.planning/phases/21-cache-first-navigation/21-UI-SPEC.md` — interaction contract and component inventory

## Metadata

**Confidence breakdown:**
- Root cause diagnosis: HIGH — bugs directly visible in source, no ambiguity
- Fix approach (loadDiagram pattern): HIGH — follows existing working cache-check code in `generateDiagram`
- Generate All via enqueue: MEDIUM — component/code level elementId handling in enqueue needs verification (Open Question 1)
- Preload binding availability: MEDIUM — not verified, flagged as Wave 0 check

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable codebase — all findings from direct source inspection)
