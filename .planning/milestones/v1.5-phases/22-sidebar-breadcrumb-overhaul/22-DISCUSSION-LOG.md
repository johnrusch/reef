# Phase 22: Sidebar & Breadcrumb Overhaul - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 22-sidebar-breadcrumb-overhaul
**Areas discussed:** Sidebar highlight behavior, Sidebar resize & layout, Element tree in sidebar, Breadcrumb segments

---

## Sidebar Highlight Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Pure bug fix (Recommended) | Fix the onNavigate handler so sidebar clicks properly update the navigation stack. The highlight logic itself is already correct. | ✓ |
| Add visual feedback layer | Beyond fixing the wiring, add a brief highlight transition/animation when switching levels. | |
| You decide | Claude picks the best approach based on the code. | |

**User's choice:** Pure bug fix
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, all navigation sources (Recommended) | Sidebar highlight always reflects current position regardless of how the user got there. | ✓ |
| Sidebar clicks only | Only update highlight when user clicks in the sidebar itself. | |

**User's choice:** All navigation sources
**Notes:** None

---

## Sidebar Resize & Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Drag handle with react-resizable-panels (Recommended) | Wrap sidebar + diagram viewer in PanelGroup with PanelResizeHandle. Reuses existing dependency. | ✓ |
| Wider default, no drag | Increase default width to w-72. Keep collapse toggle but no drag resize. | |
| You decide | Claude picks the best approach based on codebase patterns. | |

**User's choice:** Drag handle with react-resizable-panels
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, persist with localStorage (Recommended) | react-resizable-panels supports autoSaveId for localStorage persistence. | ✓ |
| No, reset to default each session | Always start at default width. | |

**User's choice:** Persist with localStorage
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Hide drag handle when collapsed (Recommended) | Collapsed sidebar is a thin icon strip. No resize needed — expand button restores to last saved width. | ✓ |
| Keep drag handle always visible | User can drag from collapsed to expanded without clicking the expand button first. | |

**User's choice:** Hide drag handle when collapsed
**Notes:** None

---

## Element Tree in Sidebar

| Option | Description | Selected |
|--------|-------------|----------|
| Parse from .reef/ PlantUML files (Recommended) | Read .puml files from .reef/ storage to extract element IDs and names. Uses extractElementIds from Phase 21. | ✓ |
| Read from SQLite/meta.json | Query diagram_storage or .meta.json for stored element metadata. | |
| You decide | Claude picks the best data source based on what's available. | |

**User's choice:** Parse from .reef/ PlantUML files
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Expand active level only (Recommended) | Only the current level's children are shown expanded. Other levels show as collapsed level headers. | ✓ |
| Show all visited levels expanded | Every level in the navigation stack shows its elements. | |
| All levels always expanded | Full tree always visible regardless of navigation state. | |

**User's choice:** Expand active level only
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| On navigation (Recommended) | Load element list when user navigates to a level. Fast enough for instant display. | ✓ |
| Eagerly on repo select | Parse all .reef/ .puml files when a repository is selected. | |
| You decide | Claude picks based on performance characteristics. | |

**User's choice:** On navigation
**Notes:** None

---

## Breadcrumb Segments

| Option | Description | Selected |
|--------|-------------|----------|
| Element name + level suffix (Recommended) | Show 'System Context (context) > Express API Server (container) > API Controllers (component)'. | ✓ |
| Deduplicate, keep deepest | If an element name repeats, only show it once at its deepest level. | |
| Level icons instead of text | Use the C4 level icons as visual markers instead of text suffixes. | |

**User's choice:** Element name + level suffix
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Always show level suffix (Recommended) | Every segment gets its level label. Consistent, always clear where you are. | ✓ |
| Only on duplicate names | Suffix only appears when the same element name exists at multiple levels. | |

**User's choice:** Always show level suffix
**Notes:** None

---

## Claude's Discretion

- Exact PanelGroup percentage splits for default sidebar vs diagram viewer proportions
- Styling of the resize handle (thin line vs visible grip dots)
- Whether collapsed icon-only sidebar uses PanelGroup or switches to simpler fixed-width layout
- How to format the level suffix visually (color, font weight, opacity)
- Empty state presentation when .reef/ data doesn't exist for a level

## Deferred Ideas

None — discussion stayed within phase scope
