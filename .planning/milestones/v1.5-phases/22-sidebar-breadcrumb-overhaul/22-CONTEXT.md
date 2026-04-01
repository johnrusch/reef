# Phase 22: Sidebar & Breadcrumb Overhaul - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can navigate the C4 hierarchy through a reliable sidebar that reflects current position (highlight tracks all navigation sources), supports drag-to-resize, shows nested drillable elements under the active level, and a breadcrumb trail with clear level context and no redundant segments.

</domain>

<decisions>
## Implementation Decisions

### Sidebar Highlight (SIDE-01)
- **D-01:** Pure bug fix approach — the highlight logic (`activeLevel` read from stack top) is already correct; fix the `onNavigate` handler wiring so sidebar clicks properly update the navigation stack
- **D-02:** Highlight tracks ALL navigation sources — sidebar clicks, breadcrumb clicks, element clicks in diagram canvas, and command palette navigation. Single source of truth is the navigation store stack.

### Sidebar Resize (SIDE-02)
- **D-03:** Use `react-resizable-panels` (already a project dependency, used in CommitWorkflowTab) — wrap sidebar + diagram viewer in PanelGroup with PanelResizeHandle
- **D-04:** Min width ~160px, max ~400px for the sidebar panel
- **D-05:** Persist sidebar width across sessions via `react-resizable-panels` `autoSaveId` (localStorage)
- **D-06:** Hide drag handle when sidebar is collapsed (icon-only mode at ~40px). Expand button restores to last saved width.

### Element Tree (SIDE-03)
- **D-07:** Data source is `.reef/` PlantUML files — use `extractElementIds` (exists from Phase 21) to parse Container/Component macros from `.puml` files
- **D-08:** Only the active level's children are shown expanded. Other levels show as collapsed level headers. Keeps sidebar compact and focused.
- **D-09:** Load element list on navigation (IPC call to main process to parse .reef/ .puml). No upfront cost. If .reef/ data doesn't exist for a level, show empty state.
- **D-10:** Clicking an element in the tree triggers drill-down navigation (same as clicking in diagram canvas)

### Breadcrumb (BRCR-01)
- **D-11:** Each breadcrumb segment shows element name + level suffix in parentheses: "System Context (context) > Express API Server (container) > API Controllers (component)"
- **D-12:** Level suffix always shows on every segment — consistent formatting, always clear where user is in the hierarchy
- **D-13:** Fix source data — ensure navigation stack entries have distinct elementNames (not the same element name repeating across levels)

### Claude's Discretion
- Exact PanelGroup percentage splits for default sidebar vs diagram viewer proportions
- Styling of the resize handle (thin line vs visible grip dots)
- Whether collapsed icon-only sidebar uses PanelGroup or switches to a simpler fixed-width layout
- How to format the level suffix visually (color, font weight, opacity)
- Empty state presentation when .reef/ data doesn't exist for a level

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sidebar component
- `src/renderer/components/DiagramViewer/C4HierarchyTree.tsx` — Current sidebar implementation (137 lines), collapse/expand, level icons, active highlight via useNavigationStore
- `src/renderer/components/DiagramViewer/DiagramViewer.tsx` — Parent component that renders sidebar + diagram viewer side by side

### Breadcrumb component
- `src/renderer/components/DiagramViewer/DiagramBreadcrumbs.tsx` — Current breadcrumb (48 lines), renders stack[].elementName with ChevronRight separators, WAI-ARIA

### Navigation state
- `src/renderer/stores/navigationStore.ts` — Zustand store with stack-based NavigationLevel[], push/pop/navigateTo, persist middleware

### Element parsing (Phase 21)
- `src/main/services/c4/generationQueueService.ts` — Contains `extractElementIds` function that parses PlantUML Container/Component macros to discover element IDs

### Resize pattern
- `src/renderer/components/tabs/CommitWorkflowTab.tsx` — Existing usage of react-resizable-panels (PanelGroup, Panel, PanelResizeHandle) as reference pattern

### .reef/ storage
- `src/main/services/reef/reefStorageService.ts` — ReefStorageService for reading .puml files from .reef/ folder

### Bug documentation
- `.planning/v1.5-findings.md` — Bugs #4 (highlight), #5 (resize), #6 (element tree), #7/#10 (breadcrumb) that this phase fixes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `react-resizable-panels` — Already installed and used in CommitWorkflowTab.tsx; supports autoSaveId for persistence
- `extractElementIds` in generationQueueService.ts — Parses PlantUML macros to get element IDs and names from .puml content
- `useNavigationStore` — Zustand store with field-level selectors, already used by C4HierarchyTree for highlight
- Lucide icons (Globe, Layers, Box, Code2) — Already imported in C4HierarchyTree for level indicators
- `ReefStorageService.readPuml()` — Can read .puml content from .reef/ for element parsing

### Established Patterns
- Zustand field-level selectors for reactive updates (v1.3 convention)
- IPC handler pattern for main→renderer data flow (used throughout)
- Tailwind CSS for all styling with `bg-gray-850`, `border-gray-700` dark theme palette
- `localStorage` persistence via Zustand persist middleware and react-resizable-panels autoSaveId

### Integration Points
- `DiagramViewer.tsx` — Parent that assembles sidebar + breadcrumb + diagram canvas; will need PanelGroup wrapper
- `onNavigate` callback — Sidebar → DiagramViewer → navigation store; wiring fix needed here
- IPC channel for element list — New handler to read .reef/ .puml and return parsed elements to renderer

</code_context>

<specifics>
## Specific Ideas

- Element tree preview shows the exact structure user expects: level headers with indented clickable elements beneath the active level only
- Breadcrumb format confirmed: "System Context (context) > Express API Server (container) > API Controllers (component)"
- Collapsed sidebar remains icon-only strip; drag handle hidden; expand button restores last saved width

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-sidebar-breadcrumb-overhaul*
*Context gathered: 2026-03-30*
