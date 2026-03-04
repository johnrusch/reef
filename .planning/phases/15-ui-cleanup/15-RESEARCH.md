# Phase 15: UI Cleanup - Research

**Researched:** 2026-03-04
**Domain:** React component surgery — removing UI elements without breaking data flow
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UICL-01 | User sees no configuration landing page — the settings view (C4 level picker, detail level, focus area, AI model, feature info cards, file tree button) is removed from VisualMapTab | Full settings rendering block at lines 604-985 of VisualMapTab.tsx, plus API key modal at lines 497-551. All removable; see Architecture Patterns. |
| UICL-02 | User sees no legacy toolbar controls — non-C4 diagram type buttons (Component/Class/Sequence), detail level slider, and focus area toggles are removed | DiagramControls.tsx renders these at lines 45-63 (types), 91-112 (slider), 114-149 (focus area). Component must be deleted or gutted; DiagramViewer.tsx passes all props. |
| UICL-03 | User sees no DiagramInfo sidebar — generation metadata, cost, tokens, and cache controls are removed from the diagram view | DiagramInfo.tsx is a self-contained 234-line component. DiagramViewer.tsx renders it at line 578. Single deletion. |
| UICL-04 | User sees no Beta badge on the Visual Map tab | RepositoryTabs.tsx line 20: `{ id: 'visualmap', label: 'Visual Map', icon: Map, beta: true }`. Remove `beta: true`. |
</phase_requirements>

## Summary

Phase 15 is pure subtraction — no new features, no behavior changes, no API calls to add. The goal is to remove four categories of UI clutter that accumulated during the v1.x C4 diagram development phase. The work is entirely in the renderer layer (`src/renderer/`) and touches five files.

The most complex removal is UICL-01: the `VisualMapTab` configuration landing page. This is the fallback `return` block at the end of VisualMapTab.tsx (lines 604-985) that renders when `viewMode === 'settings'`. Removing it requires ensuring that the tab always routes to either `GeneratePromptCard` (no diagram yet) or `DiagramViewer` (diagram exists), with no third `settings` branch.

The remaining removals are mechanical: delete `DiagramInfo` from DiagramViewer's render output (UICL-03), delete the `DiagramControls` component usage or gut its legacy-type buttons/slider/focus toggles (UICL-02), and remove `beta: true` from the visualmap tab definition (UICL-04).

**Primary recommendation:** Work file by file in dependency order — RepositoryTabs (trivial), DiagramInfo (isolated), DiagramControls (isolated), VisualMapTab (most complex). Each change is independently verifiable.

## Standard Stack

### Core (already in project — no installs needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | Component rendering | Project stack |
| TypeScript | 5.x | Type safety | Project stack |
| Tailwind CSS | 3.x | Styling | Project stack |
| Vitest | latest | Unit tests | Project stack |
| @testing-library/react | latest | Component tests | Project stack |

**Installation:** No new dependencies. This phase removes code, not adds it.

## Architecture Patterns

### Recommended Project Structure (unchanged)
```
src/renderer/components/
├── DiagramViewer/
│   ├── DiagramViewer.tsx     # MODIFY: remove DiagramControls + DiagramInfo rendering
│   ├── DiagramControls.tsx   # MODIFY or DELETE: remove legacy type buttons, detail slider, focus toggles
│   ├── DiagramInfo.tsx       # DELETE (or leave file, just stop rendering it)
│   └── ...keep all others
├── tabs/
│   └── VisualMapTab.tsx      # MODIFY: remove settings landing page (viewMode==='settings' block)
└── repository/
    └── RepositoryTabs.tsx    # MODIFY: remove beta: true from visualmap tab config
```

### Pattern 1: Dead Branch Elimination (UICL-01)
**What:** VisualMapTab has three rendering branches via `viewMode` state: `'settings'`, `'diagram'`, `'tree'`. The `'settings'` branch is the entire configuration landing page. Remove it.
**When to use:** When a UI mode has been superseded and should never appear.
**Example:**
```typescript
// BEFORE: VisualMapTab.tsx — last return block (lines 604-985)
return (
  <div className="flex items-center justify-center h-full p-6">
    {/* full settings/config UI */}
  </div>
);

// AFTER: This block is deleted. The function's flow becomes:
// 1. showApiKeyModal → return API key modal
// 2. viewMode === 'diagram' && (diagram || svgContent) && metadata → return DiagramViewer
// 3. currentState === 'never_generated' && !diagram → return GeneratePromptCard (centered)
// 4. currentState === 'generating' && !diagram → return generating spinner
// (settings block removed entirely — no fourth branch)
```

**State cleanup required:** The `viewMode` state starts as `'settings'`. After removal, the initial value must become `'diagram'` (or controlled by diagram availability). Also clean up unused state: `viewMode` state variable itself may be eliminated if `'settings'` and `'tree'` branches are both gone; `'diagram'` is the only remaining mode.

**File tree button:** The "Traditional File Tree" button (`setViewMode('tree')`) at line 950 is inside the settings block. It disappears with the block.

### Pattern 2: Sidebar Removal (UICL-03)
**What:** `DiagramInfo` is rendered as a flex sibling to the diagram panel inside `DiagramViewer.tsx`.
**When to use:** When a sidebar component needs to be entirely removed.
**Example:**
```typescript
// BEFORE: DiagramViewer.tsx lines 573-583
<div className="flex flex-1 overflow-hidden">
  <div className="flex-1 relative">
    {renderDiagramWithOverlay()}
  </div>

  <DiagramInfo
    metadata={metadata}
    changedFilesCount={changedFiles.length}
    onRefreshFromCache={() => onRegenerateDiagram({ ...currentOptions, skipCache: true })}
  />
</div>

// AFTER: Remove the DiagramInfo element; the inner div takes full width naturally
<div className="flex flex-1 overflow-hidden">
  <div className="flex-1 relative">
    {renderDiagramWithOverlay()}
  </div>
</div>
```

The `DiagramInfo` import at line 5 of DiagramViewer.tsx must also be removed.

### Pattern 3: Toolbar Component Gutting (UICL-02)
**What:** `DiagramControls` renders three control groups: diagram type buttons (Component/Class/Sequence — legacy non-C4 types), detail level slider, and focus area toggles. All three must be removed. The "Regenerate" button in the same toolbar should STAY (it is not listed for removal).

**Two implementation options:**

**Option A — Delete DiagramControls entirely:** If the Regenerate button is the only needed element, move it into DiagramPanel's existing overlay toolbar or a minimal new `<div>` in DiagramViewer. DiagramControls.tsx becomes dead code and can be deleted.

**Option B — Gut DiagramControls:** Remove the three control groups from DiagramControls JSX but keep the component with just the Regenerate and Force Regenerate buttons. Keep the file, keep the props that still matter (`isGenerating`, `onRegenerate`, `onForceRegenerate`), remove unused props.

**Recommendation: Option B (gut, don't delete)** — lower risk, preserves the Regenerate confirmation dialog logic that lives inside DiagramControls.tsx. Fewer moving parts.

```typescript
// DiagramControls.tsx — AFTER gutting
// Remove: diagramTypes buttons, detailLevels slider, focusAreas toggles
// Keep: Regenerate button, Force Regenerate button, confirm dialog
// Remove unused imports and props: onTypeChange, onDetailLevelChange, onFocusAreaChange,
//   currentType, currentDetailLevel, currentFocusArea, showChanges, hasChangedFiles, onShowChangesToggle
```

**Note:** DiagramViewer.tsx passes many now-unused props to DiagramControls. After gutting DiagramControls, remove the corresponding prop threading in DiagramViewer.

### Pattern 4: Config Object Field Removal (UICL-04)
**What:** `RepositoryTabs.tsx` defines the tab array as a constant. Remove `beta: true` from the visualmap entry.
**Example:**
```typescript
// BEFORE: RepositoryTabs.tsx line 20
{ id: 'visualmap', label: 'Visual Map', icon: Map, beta: true },

// AFTER
{ id: 'visualmap', label: 'Visual Map', icon: Map },
```

The `Tab` interface still has `beta?: boolean` (optional field). The render logic `{tab.beta && ...}` still compiles correctly — it just never renders. Optionally clean up the interface field and render check if desired.

### Anti-Patterns to Avoid
- **Removing too much state:** `apiKey`, `isConfigured`, `showApiKeyModal` in VisualMapTab — these power the API key modal that stays. Do NOT remove them.
- **Breaking diagram generation:** `generateDiagram()`, `detectChangedFiles()`, `handleSvgGenerated()` — these are used in the DiagramViewer path. Keep them all.
- **Removing `viewMode` before removing all `viewMode` references:** If you set `viewMode` initial state to `'diagram'` but leave the `viewMode === 'diagram'` guard condition, it still works. But if you remove the `viewMode` variable entirely, remove all references first.
- **Prop mismatch after gutting DiagramControls:** DiagramViewer.tsx (lines 550-563) passes many props to DiagramControls. After gutting, update the call site to remove props no longer accepted.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Removing JSX blocks | Custom abstraction | Direct deletion | Over-engineering; just delete the code |
| State cleanup | Migration layer | Remove state vars and their usages | Dead state causes TypeScript errors that guide cleanup |
| TypeScript validation | Manual prop checking | Run `npm run typecheck` | Compiler catches all broken prop threads |

**Key insight:** This phase has no algorithmic complexity. The risk is accidental over-deletion. Let TypeScript errors guide the cleanup — removing a prop type will cause errors at all call sites, surfacing every place to update.

## Common Pitfalls

### Pitfall 1: Orphaned State Variables
**What goes wrong:** State variables like `diagramType`, `detailLevel`, `focusArea`, `modelType` in VisualMapTab were used by the settings UI. Some may still be used by `generateDiagram()`.
**Why it happens:** The settings UI and the generation function share the same local state.
**How to avoid:** Audit each state var: is it read only in the deleted settings block, or also used in `generateDiagram()`?
**Decision:** `diagramType`, `detailLevel`, `focusArea`, `modelType` ARE still used in `generateDiagram()` (lines 291-296) and in the `useEffect` hooks for loading persisted diagrams. Keep them. Remove them from JSX only.
**Warning signs:** TypeScript "unused variable" warnings after deletion.

### Pitfall 2: Prop Thread Breakage in DiagramViewer
**What goes wrong:** After gutting DiagramControls, the props `currentType`, `currentDetailLevel`, `currentFocusArea`, `showChanges`, `hasChangedFiles`, `onTypeChange`, `onDetailLevelChange`, `onFocusAreaChange`, `onShowChangesToggle` become unused in DiagramControls but are still passed by DiagramViewer.
**Why it happens:** Props are threaded top-down; deletion of the receiver must also clean the sender.
**How to avoid:** After modifying DiagramControls interface, run `npm run typecheck` — it will report all call-site mismatches in DiagramViewer.
**Warning signs:** `Property 'X' does not exist on type 'DiagramControlsProps'` TypeScript errors.

### Pitfall 3: `viewMode` Initial State Leaves Gap
**What goes wrong:** If `viewMode` starts as `'settings'` and the settings branch is removed, the component falls through to... nothing for repos that have a stored diagram but haven't loaded it yet.
**Why it happens:** The `viewMode === 'diagram'` gate in VisualMapTab.tsx (line 557) only renders DiagramViewer when `viewMode === 'diagram'`. On mount, `viewMode` is `'settings'`, so even if `diagram` or `svgContent` loads, the DiagramViewer won't appear until `setViewMode('diagram')` is called by the load effect.
**How to avoid:** The existing `loadPersistedDiagram` effect (lines 67-136) already calls `setViewMode('diagram')` when a stored diagram is found. The `generateDiagram` function also calls `setViewMode('diagram')` on success. So the flow works. BUT: the initial `viewMode` state value of `'settings'` should be changed to something that makes intent clear. Consider initializing to `'diagram'` since the settings view no longer exists.
**Warning signs:** Diagram tabs appearing blank on initial load for repos with stored diagrams.

### Pitfall 4: Removing `FolderTree` / File Tree View
**What goes wrong:** The `viewMode === 'tree'` branch is never shown in the requirements as staying. But the file tree functionality itself (via `FolderTree` component or similar) may need review.
**How to avoid:** Check if `'tree'` mode has its own render branch in VisualMapTab. Searching the file: `viewMode === 'tree'` is NOT in the fallback return block — there is no separate tree-render branch visible. The only tree reference is the button at line 950 that sets `viewMode('tree')`. Once the settings block is removed, the tree button disappears. No additional tree-rendering code to worry about.

## Code Examples

### Verified Removal Map

**File 1: `src/renderer/components/repository/RepositoryTabs.tsx`**
```typescript
// Change line 20 from:
{ id: 'visualmap', label: 'Visual Map', icon: Map, beta: true },
// To:
{ id: 'visualmap', label: 'Visual Map', icon: Map },
// Optionally remove Tab interface field: beta?: boolean
// Optionally remove render: {tab.beta && (<span>Beta</span>)}
```

**File 2: `src/renderer/components/DiagramViewer/DiagramViewer.tsx`**
```typescript
// Remove line 5: import { DiagramInfo } from './DiagramInfo';
// Remove lines 578-582 (DiagramInfo element inside flex container)
// After gutting DiagramControls: remove props no longer in DiagramControlsProps
// (currentType, currentDetailLevel, currentFocusArea, showChanges, hasChangedFiles,
//  onTypeChange, onDetailLevelChange, onFocusAreaChange, onShowChangesToggle)
```

**File 3: `src/renderer/components/DiagramViewer/DiagramControls.tsx`**
```typescript
// Remove interface props: currentType, currentDetailLevel, currentFocusArea,
//   showChanges, hasChangedFiles, onTypeChange, onDetailLevelChange,
//   onFocusAreaChange, onShowChangesToggle
// Remove consts: diagramTypes, detailLevels, focusAreas
// Remove JSX: the three control groups (diagram type buttons, slider group, focus area group)
// Keep: Regenerate button, Force Regenerate button, confirm dialog state + JSX
// Remove unused imports: Sliders (if removed with slider), Eye, EyeOff
```

**File 4: `src/renderer/components/tabs/VisualMapTab.tsx`**
```typescript
// Remove: entire last return block (lines 604-985) — the settings configuration page
// Remove unused imports: Map, FileCode, GitBranch, FolderTree, Settings, Play, FileText
//   (check each against remaining code paths before removing)
// Keep: showApiKeyModal return block (lines 497-551)
// Keep: viewMode === 'diagram' return block (lines 557-574)
// Keep: never_generated return block (lines 577-587)
// Keep: generating return block (lines 589-602)
// Consider: change viewMode initial state from 'settings' to 'diagram'
// Consider: remove 'settings' and 'tree' from the viewMode type union
```

**File 5: `src/renderer/components/DiagramViewer/DiagramInfo.tsx`**
```
No edits required — file can be left in place (it's just not imported anymore).
Or delete the file to avoid dead code.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Settings landing page before generating | GeneratePromptCard for first-time empty state | v1.2 (GeneratePromptCard added) | Settings page is now redundant; GeneratePromptCard handles the 'never_generated' state |
| Manual control of detail/focus/type from toolbar | C4 hierarchy navigation via breadcrumbs | v1.2 | DiagramControls legacy type buttons/sliders are truly obsolete |
| Beta badge on Visual Map tab | Production-ready tab | v1.3 | Badge reflects feature maturity, now ready to remove |

**Deprecated/outdated:**
- `DiagramControls` component's non-C4 type buttons (Component/Class/Sequence): superseded by C4 navigation via breadcrumbs
- `DiagramControls` detail level slider: C4 generation now uses fixed defaults internally
- `DiagramControls` focus area toggles: removed from C4 generation parameters
- `DiagramInfo` sidebar: generation metadata not needed in the explorer view

## Open Questions

1. **Should `DiagramControls.tsx` be fully deleted or just gutted?**
   - What we know: The Regenerate and Force Regenerate buttons with confirm dialog logic live there
   - What's unclear: Phase 16 may build a new minimal toolbar replacing DiagramControls entirely
   - Recommendation: Gut it for now (keep file, remove legacy controls). Phase 16 can delete or repurpose.

2. **Should unused state variables in VisualMapTab be cleaned up?**
   - What we know: `diagramType`, `detailLevel`, `focusArea`, `modelType` feed `generateDiagram()` — keep. `availableContainers`, `availableComponents`, `loadingElements` only render in the deleted settings block.
   - Recommendation: Remove `availableContainers`, `availableComponents`, `loadingElements` state and their associated `fetchAvailableContainers`/`fetchAvailableComponents` functions if they only served the settings view. BUT verify they're not used in `generateDiagram()` — a quick grep confirms they only affect the deleted block rendering.

## Validation Architecture

> nyquist_validation key is absent from config.json — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + @testing-library/react |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UICL-01 | VisualMapTab shows no configuration landing page | unit | `npm run test:unit -- --reporter=verbose` | ❌ Wave 0 |
| UICL-02 | DiagramViewer toolbar has no legacy type buttons, slider, or focus toggles | unit | `npm run test:unit -- --reporter=verbose` | ❌ Wave 0 |
| UICL-03 | DiagramViewer has no DiagramInfo sidebar | unit | `npm run test:unit -- --reporter=verbose` | ❌ Wave 0 |
| UICL-04 | Visual Map tab shows no Beta badge | unit | `npm run test:unit -- --reporter=verbose` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/renderer/components/tabs/VisualMapTab.test.tsx` — covers UICL-01 (no settings page rendered)
- [ ] `tests/unit/renderer/components/DiagramViewer/DiagramControls.test.tsx` — covers UICL-02 (no legacy type buttons)
- [ ] `tests/unit/renderer/components/DiagramViewer/DiagramViewer.uicl.test.tsx` — covers UICL-03 (no DiagramInfo rendered)
- [ ] `tests/unit/renderer/components/repository/RepositoryTabs.test.tsx` — covers UICL-04 (no Beta badge)

**Note:** Existing tests in `tests/unit/renderer/components/DiagramViewer/` (KeyboardShortcuts, NavigationDrillDown, etc.) must continue to pass after DiagramControls changes, since DiagramViewer is their subject. These are regression guards.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `src/renderer/components/tabs/VisualMapTab.tsx` (987 lines, fully read)
- Direct code inspection of `src/renderer/components/DiagramViewer/DiagramViewer.tsx` (608 lines, fully read)
- Direct code inspection of `src/renderer/components/DiagramViewer/DiagramControls.tsx` (227 lines, fully read)
- Direct code inspection of `src/renderer/components/DiagramViewer/DiagramInfo.tsx` (234 lines, fully read)
- Direct code inspection of `src/renderer/components/repository/RepositoryTabs.tsx` (64 lines, fully read)
- `.planning/REQUIREMENTS.md` — UICL-01 through UICL-04 definitions

### Secondary (MEDIUM confidence)
- `vitest.config.ts` — test runner configuration, environment settings verified
- `.planning/STATE.md` — phase context and v1.3 scope confirmed

### Tertiary (LOW confidence)
- None — all findings based on direct source code inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; existing project stack confirmed by inspection
- Architecture: HIGH — all target code located and read in full; removal boundaries clear
- Pitfalls: HIGH — identified from direct code reading of state variables and prop threading

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable codebase; no external dependencies changing)
