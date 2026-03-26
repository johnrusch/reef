# Phase 16: Explorer UI - Research

**Researched:** 2026-03-04
**Domain:** React component composition — sidebar tree navigation, breadcrumb hierarchy, and minimal toolbar for C4 diagram explorer
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | User can browse the full C4 hierarchy via a collapsible sidebar tree (Context → Containers → Components → Code) | `navigationStore.ts` already holds the stack with 4 C4 levels; needs a new `C4HierarchyTree` component that renders the 4-level tree with collapsible nodes, reading from/writing to existing store |
| NAV-02 | User can see current position in C4 hierarchy via a breadcrumb bar with clickable ancestors | `DiagramBreadcrumbs.tsx` already exists and works; requirement is likely about ensuring it is always visible and has full 4-level labels. Current implementation renders from `navigationStore.stack` and supports `onNavigate`; may need label/styling refinement |
| NAV-03 | Sidebar tree auto-expands and highlights the active node when user drills down by clicking diagram elements | `handleElementClick` in `DiagramViewer.tsx` already calls `navigationStore.push()` on drill-down; sidebar tree (NAV-01) must subscribe to the same store and highlight `currentLevel()` automatically |
| GEN-01 | User sees a clean single-button prompt on first visit that generates all 4 C4 levels with one click | `GeneratePromptCard.tsx` currently generates the active level only. Need to wire the button to trigger generation for all 4 levels (context → container → component → code) sequentially; or expose a new IPC bulk-generate call |
| GEN-02 | User can regenerate diagrams and toggle change visibility via a minimal toolbar replacing the old DiagramControls | `DiagramControls.tsx` (Phase 15 gutted version) already has just Regenerate + Force Regenerate. Need to add a "show changes" toggle button and verify current controls are the only two (no excess clutter) |
</phase_requirements>

## Summary

Phase 16 builds the explorer UI on top of the clean canvas left by Phase 15. The infrastructure is substantially in place: `navigationStore.ts` manages the 4-level C4 stack with push/pop/navigateTo, `DiagramBreadcrumbs.tsx` renders a clickable breadcrumb trail from that stack, `DiagramViewer.tsx` handles element click drill-down by pushing to the store, and `DiagramControls.tsx` (post-Phase-15 gutting) holds just the Regenerate button.

The two genuinely new pieces are: (1) a **C4HierarchyTree sidebar** — a left-panel component that renders the four C4 levels as a tree, subscribes to `navigationStore`, and highlights/expands the active node automatically when the user drills down, and (2) wiring `GeneratePromptCard` to trigger all-4-level generation with one click (GEN-01). The breadcrumb requirement (NAV-02) is largely satisfied by the existing `DiagramBreadcrumbs`; the work is integration — ensuring it appears in the layout and labels are correct. The toolbar requirement (GEN-02) is satisfied by adding a single "toggle changes" button to the existing `DiagramControls`.

The most architecturally significant decision is **where to put the sidebar**: it needs to be a sibling panel to the diagram view, inside the `DiagramViewer.tsx` flex layout. The sidebar must receive `navigationStore` subscriptions and call `handleBreadcrumbNavigate`/`handleElementClick`-equivalent logic when a node is clicked.

**Primary recommendation:** Build `C4HierarchyTree.tsx` as a new component inside `src/renderer/components/DiagramViewer/`, integrate it as a left sidebar in `DiagramViewer.tsx`'s existing flex layout (`flex-1 overflow-hidden` container), and wire it to `navigationStore`. Keep the toolbar minimal — add one toggle-changes button to `DiagramControls`, remove the Force Regenerate button (it was implementation-era scaffolding, not a user-facing feature).

## Standard Stack

### Core (already in project — no installs needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | Component rendering | Project stack |
| TypeScript | 5.x | Type safety | Project stack |
| Tailwind CSS | 3.x | Styling | Project stack |
| Zustand | 4.x | State management (navigationStore) | Project stack — already used for nav |
| lucide-react | latest | Icons (ChevronRight, ChevronDown, Circle, Layers) | Project stack — already used in all sidebar components |

### No New Dependencies
This phase is pure React component composition on the existing stack. No new npm packages needed.

**Installation:** None. All required libraries already in `package.json`.

## Architecture Patterns

### Current Layout (post-Phase-15)
```
DiagramViewer.tsx
├── DiagramControls          ← toolbar (top bar: Regenerate + Force Regenerate)
├── DiagramBreadcrumbs       ← breadcrumb bar (below toolbar, only for C4 types)
└── flex container (flex-1 overflow-hidden)
    └── diagram panel (flex-1 relative)
        ├── DiagramPanel     ← the actual SVG diagram
        └── StalenessBadge   ← overlay badge
```

### Target Layout (Phase 16)
```
DiagramViewer.tsx
├── DiagramControls          ← minimal toolbar (Regenerate + show-changes toggle)
├── DiagramBreadcrumbs       ← breadcrumb bar (always visible for C4 types)
└── flex container (flex-1 overflow-hidden)
    ├── C4HierarchyTree      ← NEW: left sidebar (collapsible, ~200px wide)
    └── diagram panel (flex-1 relative)
        ├── DiagramPanel     ← the actual SVG diagram
        └── StalenessBadge   ← overlay badge
```

### Pattern 1: C4HierarchyTree Sidebar Component (NAV-01, NAV-03)

**What:** A new left sidebar component that renders the four C4 levels as a tree with the current navigation state reflected. Subscribes to `useNavigationStore` and highlights the active node. Clicking a node navigates to that level.

**Key design decisions:**
- **Width:** Fixed ~220px (`w-56` in Tailwind), not resizable for v1.3
- **Always visible:** No collapse toggle needed for v1.3; always open
- **Data source:** `navigationStore.stack` drives active state; the four C4 levels are always shown as static tree roots

**Tree structure:**
```
System Context      ← always present (root of stack, level: 'context')
  └ Containers      ← always present (level: 'container')
      └ Components  ← always present (level: 'component')
          └ Code    ← always present (level: 'code')
```

When user drills into a specific element (e.g., clicks "UserService" in Containers), the tree expands to show that element selected:
```
System Context
  └ Containers > UserService [ACTIVE]    ← elementName from stack[1]
      └ Components
          └ Code
```

**Example:**
```typescript
// Source: direct code reading of navigationStore.ts
import React from 'react';
import { useNavigationStore } from '../../stores/navigationStore';

interface C4HierarchyTreeProps {
  onNavigate: (level: 'context' | 'container' | 'component' | 'code', elementId?: string) => void;
  disabled?: boolean;
}

const C4_LEVELS = [
  { level: 'context' as const, label: 'System Context', icon: 'globe' },
  { level: 'container' as const, label: 'Containers', icon: 'layers' },
  { level: 'component' as const, label: 'Components', icon: 'box' },
  { level: 'code' as const, label: 'Code', icon: 'code' },
];

export const C4HierarchyTree: React.FC<C4HierarchyTreeProps> = ({ onNavigate, disabled }) => {
  const { stack, currentLevel } = useNavigationStore();
  const active = currentLevel();

  return (
    <aside className="w-56 bg-gray-850 border-r border-gray-700 overflow-y-auto shrink-0">
      <div className="p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          C4 Hierarchy
        </h3>
        {C4_LEVELS.map((item, index) => {
          // Find if this level has been navigated to in the stack
          const stackEntry = stack.find(s => s.level === item.level);
          const isActive = active.level === item.level;

          return (
            <div key={item.level} style={{ paddingLeft: `${index * 12}px` }}>
              <button
                onClick={() => !disabled && onNavigate(item.level, stackEntry?.elementId)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                }`}
              >
                {item.label}
                {stackEntry?.elementId && (
                  <span className="ml-1 text-xs text-gray-500 truncate">
                    › {stackEntry.elementName}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
```

**Integration in DiagramViewer.tsx:**
```typescript
// In the flex container (lines 561-565 of current DiagramViewer.tsx)
<div className="flex flex-1 overflow-hidden">
  <C4HierarchyTree
    onNavigate={handleTreeNavigate}
    disabled={isGenerating}
  />
  <div className="flex-1 relative">
    {renderDiagramWithOverlay()}
  </div>
</div>
```

**handleTreeNavigate function:**
```typescript
const handleTreeNavigate = useCallback(async (
  level: 'context' | 'container' | 'component' | 'code',
  elementId?: string
) => {
  // Find the index in the navigation stack for this level
  const targetIndex = navigationStore.stack.findIndex(s => s.level === level);

  if (targetIndex >= 0) {
    // Already in stack — navigate to it (same as breadcrumb navigate)
    await handleBreadcrumbNavigate(targetIndex);
  } else {
    // Level not in stack yet — navigate to context first then the level
    // This handles clicking a level the user hasn't reached yet
    navigationStore.reset();
    const newType = `c4-${level}` as DiagramType;
    handleControlChange({ type: newType });
    await onRegenerateDiagram({ ...currentOptions, type: newType, elementId });
  }
}, [navigationStore, handleBreadcrumbNavigate, currentOptions, onRegenerateDiagram]);
```

### Pattern 2: Single-Button All-Levels Generation (GEN-01)

**What:** `GeneratePromptCard` currently calls `generateDiagram()` which generates only the currently selected C4 level. GEN-01 requires generating all 4 levels with one click.

**Two implementation options:**

**Option A — Sequential in renderer:** Call `generateDiagram()` four times in sequence (`c4-context` → `c4-container` → `c4-component` → `c4-code`) from a new `generateAllDiagrams()` function in `VisualMapTab.tsx`.

**Option B — Single IPC bulk call:** Add a new IPC handler in the main process that generates all 4 levels and emits progress events for each.

**Recommendation: Option A (sequential in renderer)** — simpler, no backend changes required, fits the existing generation pipeline. The generation function already handles state tracking (`updating` → `fresh`) per level. Sequential calls with `await` will produce correct state transitions.

```typescript
// In VisualMapTab.tsx
const generateAllDiagrams = async () => {
  const levels: DiagramType[] = ['c4-context', 'c4-container', 'c4-component', 'c4-code'];
  for (const level of levels) {
    await generateDiagram({ type: level });
  }
};
```

**GeneratePromptCard update:**
```typescript
// GeneratePromptCard.tsx — already has onGenerate prop
// VisualMapTab passes generateAllDiagrams as onGenerate:
<GeneratePromptCard
  repoName={repository?.name || 'Repository'}
  onGenerate={generateAllDiagrams}  // was: () => generateDiagram()
  isGenerating={isGenerating}
/>
```

**Label update in GeneratePromptCard:**
The button text "Generate C4 Diagram" should become "Generate Diagrams" or "Generate All Diagrams" to communicate all-4-levels intent. The description text should also be updated.

### Pattern 3: Minimal Toolbar with Change Visibility Toggle (GEN-02)

**What:** The current `DiagramControls.tsx` (post-Phase-15 gutting) has Regenerate + Force Regenerate. GEN-02 requires exactly two controls: regenerate and toggle change visibility. Force Regenerate is a third control and should be removed. A "show/hide changes" toggle button should be added.

**Current state (DiagramControls.tsx after Phase 15):**
- Regenerate button with confirm dialog ✓
- Force Regenerate button ✗ (not in GEN-02 spec)

**Target state:**
- Regenerate button with confirm dialog ✓
- Toggle change visibility button (eye/eye-off icon) — NEW

**Toggle change visibility wiring:**
The `showChanges` prop currently exists in `DiagramViewer.tsx` but is hardcoded to `false` (`const [showChanges] = useState<boolean>(false)`) because the toggle was removed in Phase 15. For GEN-02, this needs to become actual state that the toolbar controls. The `showChanges` value feeds `DiagramPanel.showChanges` which controls whether changed elements are highlighted.

```typescript
// DiagramControls.tsx — updated interface
interface DiagramControlsProps {
  isGenerating: boolean;
  onRegenerate: () => void;
  showChanges: boolean;
  onToggleChanges: () => void;
}

// DiagramViewer.tsx — restore showChanges as mutable state
const [showChanges, setShowChanges] = useState<boolean>(false);

// Pass to DiagramControls:
<DiagramControls
  isGenerating={isGenerating}
  onRegenerate={handleRegenerate}
  showChanges={showChanges}
  onToggleChanges={() => setShowChanges(prev => !prev)}
/>
```

**Note:** `onForceRegenerate` prop and Force Regenerate button are removed. The `handleForceRegenerate` callback in `DiagramViewer.tsx` can be removed entirely (it was only used by `DiagramControls`).

### Pattern 4: Breadcrumb Bar Verification (NAV-02)

**What:** `DiagramBreadcrumbs.tsx` already exists and renders from `navigationStore.stack`. The requirement is that it always shows the current position with clickable ancestors. The existing implementation satisfies this.

**Verification needed:**
- Breadcrumbs appear below toolbar for all C4 types (current code: `{currentOptions.type.startsWith('c4-') && <DiagramBreadcrumbs ...>}` at DiagramViewer line 553) — this is correct behavior
- Labels in the stack are human-readable: stack[0] is always `{ level: 'context', elementName: 'System Context' }` (from `initialStack` in navigationStore.ts) — correct
- Drill-down pushes entries with `elementName` derived from `elementId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())` — acceptable for v1.3

**No code changes needed to DiagramBreadcrumbs.tsx itself.** Its integration into DiagramViewer.tsx is already correct. NAV-02 is satisfied by the existing component.

### Anti-Patterns to Avoid

- **Making C4HierarchyTree a global sidebar:** Keep it inside DiagramViewer's flex layout, not inside the app's main Sidebar.tsx. The tree is diagram-specific, not app-wide.
- **Duplicating navigation logic:** `handleBreadcrumbNavigate` in DiagramViewer already handles navigationStore + diagram re-fetch. Reuse it (or extract it) for tree node clicks — don't duplicate.
- **Generating all levels without error handling:** `generateAllDiagrams()` must handle partial failures — if level 2 fails, level 3 and 4 should still attempt (or the user should know what failed). At minimum, wrap each `generateDiagram()` call in try/catch and continue.
- **Removing breadcrumbs when adding tree:** Both the sidebar tree AND breadcrumbs should coexist. The tree shows the structural hierarchy; the breadcrumbs show the navigation path for the current drill-down. They serve different UX purposes.
- **Hard-coding the sidebar width:** Use Tailwind's `w-56` or `w-52`; don't use inline pixel styles which break responsive behavior.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Navigation state | Custom nav state in C4HierarchyTree | `useNavigationStore()` | Stack already tracks all 4 levels and current position |
| Tree item active detection | Manual level comparison | `navigationStore.currentLevel().level === item.level` | Store exposes `currentLevel()` getter |
| Drill-down callback | New click handler in tree | Reuse/extract `handleBreadcrumbNavigate` from DiagramViewer | Same semantics: navigate to stack index + reload diagram |
| Change visibility state | Store it in C4HierarchyTree | `useState` in DiagramViewer, pass as prop | `showChanges` already flows through DiagramViewer → DiagramPanel |
| All-levels generation | IPC bulk-generate endpoint | Sequential `generateDiagram()` calls in renderer | Generation function already exists, state tracking already works |

**Key insight:** The navigation infrastructure is already built. Phase 16 is about surface area — adding the sidebar tree face on top of the existing `navigationStore` machinery, and wiring one new UI element (toggle) to an existing prop that was hardcoded to `false`.

## Common Pitfalls

### Pitfall 1: Tree Navigation vs. Breadcrumb Navigation Divergence
**What goes wrong:** C4HierarchyTree calls `navigationStore.navigateTo()` directly without also refreshing the diagram via `onRegenerateDiagram`. The tree shows "Containers" as active but the diagram still shows Code level content.
**Why it happens:** Breadcrumb navigation in DiagramViewer calls both `navigationStore.navigateTo(index)` AND `onRegenerateDiagram(...)`. A naive tree implementation might call only the store action.
**How to avoid:** Tree node clicks must go through the same path as `handleBreadcrumbNavigate` — it must update both the navigation store AND trigger diagram regeneration (which loads from SVG cache, so it's fast).
**Warning signs:** Sidebar highlights "Containers" but diagram shows wrong level.

### Pitfall 2: `showChanges` Prop Not Connected to DiagramPanel
**What goes wrong:** Toggle button in DiagramControls fires `onToggleChanges` but the SVG highlighting doesn't change because `showChanges` state in DiagramViewer isn't wired through to `DiagramPanel.showChanges`.
**Why it happens:** `showChanges` was hardcoded to `false` in Phase 15 (no toggle UI). DiagramPanel accepts `showChanges` prop but it's been inert.
**How to avoid:** Restore `const [showChanges, setShowChanges] = useState(false)` as a settable state in DiagramViewer. Verify DiagramPanel actually reads and uses `showChanges` (it does — `_showChanges = false` destructuring at line 37 of DiagramPanel.tsx, where the underscore prefix indicates it was intentionally suppressed; need to actually use it in SVG injection logic).
**Warning signs:** Toggle button appears to work (fires callback) but SVG highlighting state doesn't change.

**Important nuance:** Check `DiagramPanel.tsx` — it accepts `showChanges` but the destructured variable is `_showChanges` (underscore prefix = unused). This means even if the toggle is wired, the visual output may not change until DiagramPanel actually reads and uses the value. Audit DiagramPanel's SVG rendering to confirm how `showChanges` affects the `directChangedIds`/`inheritedChangedIds` passed to `PlantUMLRenderer`.

### Pitfall 3: GenerateAllDiagrams Stale State Between Calls
**What goes wrong:** `generateAllDiagrams()` calls `generateDiagram({ type: 'c4-context' })` which internally sets `setDiagramType('c4-context')`. The second call `generateDiagram({ type: 'c4-container' })` reads `diagramType` state but it may not have updated yet (React state updates are async).
**Why it happens:** `useState` setters in React are async; reading `diagramType` state immediately after `setDiagramType()` returns the old value.
**How to avoid:** `generateDiagram()` accepts `options?.type` which overrides local state via `finalOptions.type = options?.type || diagramType`. So passing `{ type: 'c4-container' }` explicitly avoids reading stale `diagramType` state. This pattern is already established. The sequential calls should work correctly.
**Warning signs:** All 4 calls generate the same level (e.g., all generate `c4-context`).

### Pitfall 4: Sidebar Width Stealing Diagram Space
**What goes wrong:** Adding a 220px sidebar to a flex layout that previously used all available width causes the diagram panel to be significantly narrower, breaking the diagram layout or making it unreadable for smaller windows.
**Why it happens:** The sidebar is a new flex child; diagram panel shares space with it.
**How to avoid:** Make sidebar width compact (~`w-48` = 192px or `w-52` = 208px). Consider `shrink-0` on the sidebar and `flex-1 min-w-0` on the diagram panel to prevent overflow. The diagram SVG already scales to fill available space via PlantUMLRenderer, so it adapts.
**Warning signs:** Diagram appears cut off or overlaps sidebar.

### Pitfall 5: DiagramControls Test Breakage After GEN-02 Changes
**What goes wrong:** The existing `DiagramControls.test.tsx` tests assert that "Force Regenerate" button renders when `onForceRegenerate` is provided. After removing Force Regenerate, these tests fail.
**Why it happens:** Phase 15 tests were written against the gutted-but-still-has-Force-Regenerate version of DiagramControls.
**How to avoid:** Update `DiagramControls.test.tsx` to reflect the new interface (no `onForceRegenerate` prop, new `showChanges` + `onToggleChanges` props). The test file exists at `tests/unit/renderer/components/DiagramViewer/DiagramControls.test.tsx`.
**Warning signs:** `npm run test:unit` fails on DiagramControls.test.tsx after GEN-02 changes.

## Code Examples

Verified patterns from direct code reading:

### C4HierarchyTree Integration Point in DiagramViewer.tsx
```typescript
// Current lines 561-565 (DiagramViewer.tsx) — the flex container
<div className="flex flex-1 overflow-hidden">
  <div className="flex-1 relative">
    {renderDiagramWithOverlay()}
  </div>
</div>

// After Phase 16 — add tree as left sibling
<div className="flex flex-1 overflow-hidden">
  <C4HierarchyTree
    onNavigate={handleTreeNavigate}
    disabled={isGenerating}
  />
  <div className="flex-1 min-w-0 relative">
    {renderDiagramWithOverlay()}
  </div>
</div>
```

### DiagramControls Updated Interface (GEN-02)
```typescript
// DiagramControls.tsx — Phase 16 version
interface DiagramControlsProps {
  isGenerating: boolean;
  onRegenerate: () => void;
  // REMOVED: onForceRegenerate?: () => void;
  showChanges: boolean;           // NEW
  onToggleChanges: () => void;    // NEW
}

// Toolbar JSX — two buttons only
<div className="flex items-center gap-3">
  <button onClick={handleRegenerateClick} disabled={isGenerating}>
    <RefreshCw /> Regenerate
  </button>
  <button onClick={onToggleChanges} title="Toggle change visibility">
    {showChanges ? <EyeOff /> : <Eye />}
    {showChanges ? 'Hide Changes' : 'Show Changes'}
  </button>
</div>
```

### NavigationStore: currentLevel() Usage Pattern
```typescript
// Source: navigationStore.ts — confirmed working pattern
const { stack, currentLevel } = useNavigationStore();
const active = currentLevel(); // returns stack[stack.length - 1]
// active.level is: 'context' | 'container' | 'component' | 'code'
// active.elementId is: string | undefined
// active.elementName is: human-readable string for display
```

### handleBreadcrumbNavigate — the Pattern to Reuse
```typescript
// Source: DiagramViewer.tsx lines 193-207 — existing logic for clicking breadcrumb
const handleBreadcrumbNavigate = useCallback(async (index: number) => {
  const targetLevel = navigationStore.stack[index];
  navigationStore.navigateTo(index);  // Updates store position

  // Update diagram type to match navigation
  const newType = `c4-${targetLevel.level}` as DiagramType;
  handleControlChange({ type: newType });  // Updates local currentOptions

  // Trigger regeneration with the target elementId
  // (will hit SVG cache — fast path, sub-500ms)
  await onRegenerateDiagram({
    ...currentOptions,
    type: newType,
    elementId: targetLevel.elementId,
  });
}, [navigationStore, currentOptions, onRegenerateDiagram]);
```

### generateAllDiagrams Pattern (GEN-01)
```typescript
// In VisualMapTab.tsx — new function
const generateAllDiagrams = async () => {
  const levels: DiagramType[] = ['c4-context', 'c4-container', 'c4-component', 'c4-code'];
  for (const level of levels) {
    try {
      await generateDiagram({ type: level });
    } catch (err) {
      console.error(`Failed to generate ${level}:`, err);
      // Continue to next level even if one fails
    }
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tab-based C4 level switching (Component/Class/Sequence buttons) | `navigationStore` stack-based navigation | v1.2 | Stack drives breadcrumbs; Phase 16 adds sidebar tree on top of same stack |
| showChanges wired to toggle in DiagramControls | showChanges hardcoded to `false` | Phase 15 cleanup | GEN-02 restores toggle but as a minimal 2-button toolbar |
| GeneratePromptCard generates single current level | All-4-levels generation with one click | Phase 16 (new) | Better first-run UX — user doesn't need to know about C4 hierarchy to get started |
| DiagramInfo sidebar with generation metadata | Removed in Phase 15 | Phase 15 | Clean canvas — Phase 16 adds sidebar tree instead |

**Deprecated/outdated after Phase 16:**
- `onForceRegenerate` prop and Force Regenerate button: never a user-facing feature; removing simplifies the toolbar to the spec'd 2 controls
- `[showChanges] = useState<boolean>(false)` readonly destructuring: becomes mutable state again

## Open Questions

1. **Should C4HierarchyTree show only the 4 static levels or also individual element names?**
   - What we know: The success criteria says "listing all four C4 levels (Context, Containers, Components, Code)" — the four levels as nodes, and clicking drills into that level
   - What's unclear: Whether clicking "Containers" should show sub-nodes for each specific container (e.g., "UserService", "APIGateway") when the user has already navigated there, or just navigate to the Containers diagram
   - Recommendation: For v1.3, clicking a level navigates to that level's diagram. Sub-nodes (individual containers/components) are not required by the spec. If `elementId` is in the navigation stack for that level, clicking the level re-navigates to that element (success criteria 3 only requires "highlights the newly active node" — the node being the C4 level, not the specific element within it).

2. **What happens when user clicks a level they haven't navigated to yet?**
   - What we know: The navigation stack starts at `context`. Clicking "Components" without having drilled into a container is ambiguous — there's no `elementId` to generate a component diagram for.
   - Recommendation: Navigate to the level's root diagram (no `elementId`). This will either show a cached context/container diagram or trigger generation. The C4 hierarchy tree should visually indicate which levels have been navigated to (e.g., with a dot or different icon) vs. which are reachable but not yet visited.

3. **Should the C4HierarchyTree be collapsible?**
   - Success criteria says "collapsible sidebar tree" — so yes, a collapse/expand toggle is needed.
   - Implementation: A chevron button in the sidebar header toggles `isCollapsed` state; collapsed state shows just the icons (~40px wide), expanded state shows full labels (~220px). Local component state, no need for store.

## Validation Architecture

> `nyquist_validation` key is absent from `.planning/config.json` — treating as enabled.

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
| NAV-01 | C4HierarchyTree renders all four C4 levels in sidebar | unit | `npm run test:unit -- --reporter=verbose` | ❌ Wave 0 |
| NAV-02 | DiagramBreadcrumbs renders clickable ancestors from navigationStore stack | unit | `npm run test:unit -- --reporter=verbose` | ✅ (`NavigationDrillDown.test.tsx` covers related logic) |
| NAV-03 | C4HierarchyTree highlights active node matching navigationStore.currentLevel() | unit | `npm run test:unit -- --reporter=verbose` | ❌ Wave 0 |
| GEN-01 | GeneratePromptCard triggers generation for all 4 C4 levels on single click | unit | `npm run test:unit -- --reporter=verbose` | ❌ Wave 0 |
| GEN-02 | DiagramControls renders exactly two controls: regenerate and toggle changes | unit | `npm run test:unit -- --reporter=verbose` | ✅ (`DiagramControls.test.tsx` exists — needs updates for new interface) |

### Sampling Rate
- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/renderer/components/DiagramViewer/C4HierarchyTree.test.tsx` — covers NAV-01 (all 4 levels rendered) and NAV-03 (active node highlighting)
- [ ] `tests/unit/renderer/components/tabs/VisualMapTab.gen01.test.tsx` — covers GEN-01 (all-4-levels generation called on single click)
- [ ] Update `tests/unit/renderer/components/DiagramViewer/DiagramControls.test.tsx` — covers GEN-02 (two-button toolbar: remove Force Regenerate assertion, add show-changes toggle assertion)

*(Existing `NavigationDrillDown.test.tsx` and `DiagramBreadcrumbs` tests cover the breadcrumb logic underlying NAV-02 — no new test file needed for NAV-02, only integration verification.)*

## Sources

### Primary (HIGH confidence)
- Direct code reading of `src/renderer/components/tabs/VisualMapTab.tsx` (546 lines, post-Phase-15 version)
- Direct code reading of `src/renderer/components/DiagramViewer/DiagramViewer.tsx` (590 lines, post-Phase-15 version)
- Direct code reading of `src/renderer/components/DiagramViewer/DiagramControls.tsx` (83 lines, post-Phase-15 version)
- Direct code reading of `src/renderer/components/DiagramViewer/DiagramBreadcrumbs.tsx` (48 lines)
- Direct code reading of `src/renderer/components/DiagramViewer/GeneratePromptCard.tsx` (70 lines)
- Direct code reading of `src/renderer/components/DiagramViewer/ChangeBadge.tsx` and `StalenessBadge.tsx`
- Direct code reading of `src/renderer/stores/navigationStore.ts` (165 lines)
- Direct code reading of `src/renderer/stores/diagramStateStore.ts` (230 lines)
- `.planning/REQUIREMENTS.md` — NAV-01 through GEN-02 definitions
- `.planning/STATE.md` — v1.3 milestone scope and Phase 15 decisions

### Secondary (MEDIUM confidence)
- `tests/unit/renderer/components/DiagramViewer/DiagramControls.test.tsx` — existing test structure to update
- `tests/unit/renderer/components/DiagramViewer/DiagramViewer.uicl.test.tsx` — mock patterns to reuse
- `tests/unit/renderer/components/tabs/VisualMapTab.test.tsx` — VisualMapTab mock patterns to reuse
- `vitest.config.ts` — test runner configuration confirmed

### Tertiary (LOW confidence)
- None — all findings based on direct source code inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; existing project stack confirmed by direct inspection
- Architecture: HIGH — all target components located and fully read; integration points are clear (DiagramViewer flex layout, navigationStore subscriptions, showChanges prop chain)
- Pitfalls: HIGH — identified from direct code reading; Pitfall 2 (showChanges underscore suppression in DiagramPanel) is a real issue found in source

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable codebase; no external dependencies changing)
