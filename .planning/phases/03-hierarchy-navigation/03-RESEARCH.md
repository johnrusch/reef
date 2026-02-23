# Phase 3: Hierarchy Navigation - Research

**Researched:** 2026-02-23
**Domain:** Interactive SVG navigation, React state management, C4 hierarchy drill-down
**Confidence:** HIGH

## Summary

This phase implements clickable SVG diagrams enabling drill-down navigation through C4 hierarchy levels (Context → Container → Component → Code) with breadcrumb trail navigation. Research reveals that PlantUML generates interactive SVG elements, React provides robust event handling for SVG clicks, and Zustand can manage hierarchical navigation state efficiently.

Key findings: PlantUML SVG output embeds element IDs and supports hyperlinks natively; React event handlers work seamlessly with SVG elements via standard onClick handlers; breadcrumbs follow established accessibility patterns using nav/ol/li semantic HTML. The existing codebase already has elementId handling for Component/Code levels, providing a foundation to build upon.

**Primary recommendation:** Use PlantUML's native SVG element IDs to wire click handlers in PlantUMLRenderer, extend Zustand store with navigation history stack, and implement accessible breadcrumb component following WAI-ARIA best practices.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | User can click diagram elements to drill down from Context to Container level | PlantUML SVG elements have IDs; React onClick works on SVG; existing detectContainers logic identifies available containers |
| NAV-02 | User can click diagram elements to drill down from Container to Component level | C4PlantUMLGenerator maps containers to components; existing detectComponents logic provides drill-down targets |
| NAV-03 | User can click diagram elements to drill down from Component to Code level | Code diagram generation already accepts componentId parameter; class-level details exist in static analysis |
| NAV-04 | User sees breadcrumb trail showing current position in C4 hierarchy | Breadcrumb component pattern well-established; state tracks currentLevel + elementId chain |
| NAV-05 | User can click breadcrumbs to navigate back up hierarchy levels | onClick handlers on breadcrumb links trigger regeneration with parent elementId |
| NAV-08 | Diagram elements show visual indicators when clickable for drill-down | CSS cursor:pointer + :hover effects standard; SVG path styling via CSS classes |
| INFRA-06 | System maintains consistent element IDs across C4 hierarchy levels for navigation | C4PlantUMLGenerator.sanitizeId() provides consistent ID format; elementId already passed through generation pipeline |
| INFRA-07 | System tracks parent-child relationships between C4 diagram elements | Navigation stack stores hierarchical path; each level knows its parent context |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.2.0 | UI framework | Already in project; excellent SVG event handling |
| Zustand | 4.4.7 | State management | Already in project; lightweight, TypeScript-first |
| TypeScript | 5.3.3 | Type safety | Already in project; ensures type-safe navigation state |
| Tailwind CSS | 3.4.1 | Styling | Already in project; utility classes for hover/cursor |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.312.0 | Icons | Already in project; ChevronRight for breadcrumb separators |
| PlantUML SVG | Native | SVG generation | Already in project; native element IDs and hyperlink support |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand navigation store | React Router | Router adds unnecessary complexity for single-page diagram navigation; Zustand sufficient for navigation stack |
| Custom breadcrumb | Radix UI breadcrumb | Radix doesn't have native breadcrumb primitive; custom component simpler for this use case |
| SVG click handling | Custom event bus | Standard React onClick on SVG elements works perfectly; no need for additional abstraction |

**Installation:**
No new dependencies required — all capabilities exist in current stack.

## Architecture Patterns

### Recommended Component Structure
```
src/renderer/components/DiagramViewer/
├── DiagramPanel.tsx           # Add SVG click handler
├── DiagramBreadcrumbs.tsx     # NEW: Breadcrumb navigation
├── DiagramViewer.tsx          # Orchestrate navigation state
└── hooks/
    └── useNavigationStack.ts  # NEW: Navigation state management
```

### Pattern 1: SVG Element Click Detection
**What:** Attach click handlers to PlantUMLRenderer SVG container, identify clicked element by data attributes or element ID.
**When to use:** When SVG is rendered via dangerouslySetInnerHTML (current implementation).
**Example:**
```typescript
// In PlantUMLRenderer.tsx
const handleSvgClick = (event: React.MouseEvent) => {
  const target = event.target as SVGElement;

  // PlantUML generates IDs like "reef_main", "reef_renderer"
  const elementId = target.id || target.getAttribute('data-element-id');

  if (elementId && elementId !== 'svg_root') {
    onElementClick?.(elementId);
  }
};

<div
  className="diagram-wrapper p-8"
  onClick={handleSvgClick}
  dangerouslySetInnerHTML={{ __html: svgContent }}
/>
```

### Pattern 2: Navigation Stack Management
**What:** Use Zustand store to track hierarchical navigation path with parent-child relationships.
**When to use:** For managing drill-down/drill-up state across C4 levels.
**Example:**
```typescript
interface NavigationLevel {
  level: 'context' | 'container' | 'component' | 'code';
  elementId?: string;
  elementName: string;
}

interface NavigationStore {
  stack: NavigationLevel[];
  push: (level: NavigationLevel) => void;
  pop: () => void;
  reset: () => void;
  navigateToLevel: (index: number) => void;
}

const useNavigationStore = create<NavigationStore>((set) => ({
  stack: [{ level: 'context', elementName: 'System Context' }],
  push: (level) => set((state) => ({ stack: [...state.stack, level] })),
  pop: () => set((state) => ({ stack: state.stack.slice(0, -1) })),
  reset: () => set({ stack: [{ level: 'context', elementName: 'System Context' }] }),
  navigateToLevel: (index) => set((state) => ({ stack: state.stack.slice(0, index + 1) })),
}));
```

### Pattern 3: Accessible Breadcrumb Component
**What:** Semantic HTML breadcrumb using nav/ol/li with aria-label for accessibility.
**When to use:** Always — breadcrumbs are primary navigation mechanism.
**Example:**
```typescript
// Source: WAI-ARIA best practices for breadcrumbs
export const DiagramBreadcrumbs: React.FC<{ stack: NavigationLevel[]; onNavigate: (index: number) => void }> = ({ stack, onNavigate }) => (
  <nav aria-label="C4 diagram breadcrumb" className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
    <ol className="flex items-center gap-2 list-none">
      {stack.map((level, index) => (
        <li key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-500" />}
          {index < stack.length - 1 ? (
            <button
              onClick={() => onNavigate(index)}
              className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
            >
              {level.elementName}
            </button>
          ) : (
            <span className="text-sm text-gray-300 font-medium" aria-current="page">
              {level.elementName}
            </span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);
```

### Pattern 4: Cursor and Hover Indicators
**What:** CSS-based visual feedback for clickable elements using cursor:pointer and hover state.
**When to use:** Always for clickable SVG elements — improves discoverability.
**Example:**
```css
/* Add to global styles or component CSS */
.diagram-wrapper svg [id]:hover {
  cursor: pointer;
  opacity: 0.8;
}

/* For PlantUML generated elements with classes */
.diagram-wrapper svg .clickable-element {
  cursor: pointer;
}

.diagram-wrapper svg .clickable-element:hover {
  filter: brightness(1.1);
  stroke-width: 2;
}
```

### Anti-Patterns to Avoid
- **Modifying SVG DOM directly:** PlantUML regenerates SVG on each render; attach handlers to container, not individual SVG elements.
- **Deep element ID parsing:** Use PlantUML's sanitizeId() format consistently; don't attempt to reverse-engineer IDs from diagram content.
- **Synchronous navigation:** Always await diagram generation before updating navigation stack to prevent stale state.
- **Breadcrumb without aria-label:** Fails accessibility; always include semantic nav wrapper with aria-label.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Element ID generation | Custom ID scheme | C4PlantUMLGenerator.sanitizeId() | Already generates consistent IDs; PlantUML requires specific format |
| Navigation history | Custom stack implementation | Zustand store with array methods | Zustand provides reactivity, persistence middleware, TypeScript support |
| Breadcrumb styling | Custom CSS framework | Tailwind utility classes | Already in project; responsive, consistent with existing UI |
| SVG event delegation | Custom event bus | React's native onClick | React's synthetic events work perfectly with SVG; no need for custom layer |

**Key insight:** PlantUML and React already provide 90% of required functionality. Focus implementation on wiring existing capabilities rather than building custom abstractions.

## Common Pitfalls

### Pitfall 1: SVG Event Bubbling Confusion
**What goes wrong:** Clicks on nested SVG elements (text inside rect) bubble up; handler fires multiple times or gets wrong element ID.
**Why it happens:** SVG has complex nested structure; PlantUML wraps elements in groups.
**How to avoid:** Use event.currentTarget vs event.target correctly; traverse DOM to find element with ID attribute; stop propagation after handling.
**Warning signs:** Click handler fires twice; elementId is undefined or points to wrong element.

### Pitfall 2: PlantUML ID Inconsistency
**What goes wrong:** Element IDs change between generations; navigation breaks after regeneration.
**Why it happens:** PlantUML may add suffix to duplicate IDs; sanitization may differ between levels.
**How to avoid:** Always use C4PlantUMLGenerator.sanitizeId() for consistency; test ID generation with same input multiple times.
**Warning signs:** Navigation works initially but breaks after diagram refresh; elementId not found in newly generated diagram.

### Pitfall 3: Breadcrumb State Desync
**What goes wrong:** User clicks back on breadcrumb but navigation stack doesn't update; or diagram changes but breadcrumb doesn't reflect it.
**Why it happens:** State updates are asynchronous; navigation and diagram generation aren't coordinated.
**How to avoid:** Use single source of truth (Zustand store); update stack before triggering regeneration; use useEffect to sync stack with current diagram.
**Warning signs:** Breadcrumb shows "Context" but diagram shows "Component" level; clicking breadcrumb doesn't navigate.

### Pitfall 4: Inaccessible Breadcrumbs
**What goes wrong:** Screen readers can't navigate breadcrumbs; keyboard navigation doesn't work.
**Why it happens:** Missing semantic HTML (nav/ol/li); no aria-label; current page not marked with aria-current.
**How to avoid:** Follow WAI-ARIA breadcrumb pattern; use semantic elements; test with screen reader; ensure tab navigation works.
**Warning signs:** Lighthouse accessibility score drops; breadcrumbs announced as "buttons" not "navigation".

### Pitfall 5: Click Detection on Loading State
**What goes wrong:** User clicks element while diagram is generating; navigation fires with stale data.
**Why it happens:** Click handlers still active during loading; async generation doesn't disable clicks.
**How to avoid:** Disable click handlers when isGenerating is true; add loading overlay that blocks pointer events.
**Warning signs:** Navigation stack corrupted; multiple diagram generations triggered simultaneously.

## Code Examples

Verified patterns from official sources and project conventions:

### Detecting Clicked PlantUML Element
```typescript
// Source: React SVG event handling + PlantUML ID structure
const handleSvgClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
  if (isGenerating) return; // Prevent clicks during generation

  const target = event.target as SVGElement;

  // Traverse up to find element with ID (PlantUML wraps in groups)
  let element: SVGElement | null = target;
  let elementId: string | null = null;

  while (element && !elementId) {
    elementId = element.id || element.getAttribute('data-id');
    element = element.parentElement as SVGElement;
  }

  if (elementId && onElementClick) {
    onElementClick(elementId);
  }
}, [isGenerating, onElementClick]);
```

### Navigation Stack with Zustand
```typescript
// Source: Zustand TypeScript patterns
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NavigationLevel {
  level: C4Level;
  elementId?: string;
  elementName: string;
}

interface NavigationState {
  stack: NavigationLevel[];
  currentLevel: () => NavigationLevel;
  push: (level: NavigationLevel) => void;
  navigateTo: (index: number) => void;
  reset: () => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      stack: [{ level: 'context', elementName: 'System Context' }],

      currentLevel: () => {
        const stack = get().stack;
        return stack[stack.length - 1];
      },

      push: (level) => set((state) => ({
        stack: [...state.stack, level]
      })),

      navigateTo: (index) => set((state) => ({
        stack: state.stack.slice(0, index + 1)
      })),

      reset: () => set({
        stack: [{ level: 'context', elementName: 'System Context' }]
      }),
    }),
    { name: 'diagram-navigation' }
  )
);
```

### Integrating Navigation with Diagram Generation
```typescript
// In DiagramViewer.tsx
const navigationStore = useNavigationStore();

const handleElementClick = useCallback(async (elementId: string) => {
  const currentLevel = navigationStore.currentLevel();

  // Determine next level based on current
  const nextLevel = getNextLevel(currentLevel.level);

  if (!nextLevel) return; // Already at Code level

  // Get human-readable name for breadcrumb
  const elementName = await getElementName(elementId, nextLevel);

  // Push to navigation stack
  navigationStore.push({
    level: nextLevel,
    elementId,
    elementName,
  });

  // Trigger diagram regeneration with new level and elementId
  await onRegenerateDiagram({
    type: `c4-${nextLevel}`,
    elementId,
    // ... other options
  });
}, [navigationStore, onRegenerateDiagram]);

const handleBreadcrumbClick = useCallback(async (index: number) => {
  // Navigate to specific level in stack
  navigationStore.navigateTo(index);

  const targetLevel = navigationStore.stack[index];

  // Regenerate diagram for that level
  await onRegenerateDiagram({
    type: `c4-${targetLevel.level}`,
    elementId: targetLevel.elementId,
    // ... other options
  });
}, [navigationStore, onRegenerateDiagram]);
```

### CSS Hover Indicators
```css
/* In component CSS or global styles */
.diagram-wrapper svg [id] {
  transition: opacity 0.2s ease;
}

.diagram-wrapper svg [id]:hover {
  cursor: pointer;
  opacity: 0.85;
}

/* For better accessibility, also handle focus */
.diagram-wrapper svg [id]:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual SVG manipulation | React onClick on container | React 16+ | Declarative event handling; no direct DOM manipulation |
| Redux for navigation | Zustand with middleware | 2020-2023 | 90% less boilerplate; better TypeScript support; built-in persistence |
| Custom CSS for cursors | Tailwind utility classes | Project adoption | Consistent styling; responsive hover states; accessibility helpers |
| Inline aria attributes | Semantic HTML + aria-label | WAI-ARIA 1.2 | Better screen reader support; semantic structure improves SEO |

**Deprecated/outdated:**
- Direct SVG DOM manipulation: React's virtual DOM makes this anti-pattern; use event delegation instead
- Context API for navigation: Overkill for this use case; Zustand provides simpler API with better performance

## Open Questions

1. **Should navigation persist across repository changes?**
   - What we know: Zustand persist middleware can save stack to localStorage
   - What's unclear: Whether user expects to return to same C4 level when switching repos
   - Recommendation: Clear navigation stack on repository change; persist only within same repo session

2. **How to handle element name resolution for breadcrumbs?**
   - What we know: PlantUML sanitizes IDs ("Main Process" → "main_process"); need reverse mapping
   - What's unclear: Whether to extract from diagram content or maintain separate name mapping
   - Recommendation: Store original name in navigation stack at push time; don't try to reverse-engineer from ID

3. **Should keyboard shortcuts navigate breadcrumbs?**
   - What we know: Alt+Left/Right are browser navigation; Ctrl+Up could work
   - What's unclear: Whether keyboard navigation is in scope for Phase 3 or deferred to Phase 4
   - Recommendation: Phase 4 covers keyboard shortcuts (NAV-07); focus on click navigation for Phase 3

## Sources

### Primary (HIGH confidence)
- [PlantUML Link Documentation](https://plantuml.com/link) - Hyperlink syntax and SVG output behavior
- [PlantUML Forum: SVG Elements with IDs](https://forum.plantuml.net/10400/svg-elements-with-ids) - Element ID structure in generated SVG
- [React SVG Event Handling](https://medium.com/weekly-webtips/how-to-make-clickable-dynamic-graphics-in-react-using-svg-22071f96623d) - SVG click detection patterns
- [Zustand Documentation](https://zustand.docs.pmnd.rs/) - State management with TypeScript

### Secondary (MEDIUM confidence)
- [WAI-ARIA Breadcrumb Pattern](https://www.freecodecamp.org/news/react-navigation-build-a-breadcrumb-component/) - Accessibility best practices
- [CSS Cursor Property MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/cursor) - Cursor styling for interactive elements
- [CSS :hover Selector 2026](https://thelinuxcode.com/css-hover-selector-in-2026-practical-patterns-pitfalls-and-accessible-interactions/) - Hover state patterns and accessibility

### Tertiary (LOW confidence)
- [PlantUML Interactive Diagrams](https://forum.plantuml.net/13350/add-interactive-functionality-usecase-diagrams-exported) - Use case diagram interactivity (may differ from C4)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project; verified versions
- Architecture: HIGH - Patterns verified in existing codebase (StalenessBadge, Zustand stores)
- Pitfalls: HIGH - Based on SVG/React integration and PlantUML ID generation analysis
- Element ID consistency: HIGH - Verified C4PlantUMLGenerator.sanitizeId() method exists and is used

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (30 days - stable technologies)
