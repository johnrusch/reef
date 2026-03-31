# Phase 23: Code-Level Diagram Quality - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 23-code-level-diagram-quality
**Areas discussed:** Non-class code representation, Component-to-code matching, Diagram density & filtering, Empty/minimal fallback

---

## Non-Class Code Representation

### Q1: How should exported functions appear in code-level diagrams?

| Option | Description | Selected |
|--------|-------------|----------|
| UML class-like boxes (Recommended) | Render exported functions as stereotyped classes (<<function>>) with parameters as 'properties' and return type shown | ✓ |
| PlantUML object notation | Use PlantUML 'object' keyword — visually distinct from classes but still structured | |
| You decide | Let Claude pick best PlantUML representation | |

**User's choice:** UML class-like boxes (Recommended)
**Notes:** None

### Q2: Should React functional components get special treatment?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, <<component>> stereotype (Recommended) | Detect React components and show with <<component>> stereotype, listing hooks and props | ✓ |
| No, treat same as functions | All exported functions get <<function>> representation | |
| You decide | Claude picks based on what static analyzer can reliably extract | |

**User's choice:** Yes, <<component>> stereotype (Recommended)
**Notes:** None

### Q3: Should type aliases and enums also appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Enums yes, type aliases no (Recommended) | Enums have clear UML representation (<<enumeration>>). Type aliases too numerous and abstract. | ✓ |
| Both enums and exported type aliases | Show type aliases as stereotyped classes too. More complete but noisy. | |
| Neither, keep to classes + functions | Only show executable code. Types are documentation, not architecture. | |

**User's choice:** Enums yes, type aliases no (Recommended)
**Notes:** None

---

## Component-to-Code Matching

### Q1: How should code elements be matched to their parent component?

| Option | Description | Selected |
|--------|-------------|----------|
| Directory-based matching (Recommended) | Reuse directory-to-component mapping from component-level generation | ✓ |
| ElementIdRegistry lookup | Use ElementIdRegistry to resolve componentId → directory path | |
| You decide | Claude picks approach that integrates best | |

**User's choice:** Directory-based matching (Recommended)
**Notes:** None

### Q2: Should code diagrams include elements from subdirectories?

| Option | Description | Selected |
|--------|-------------|----------|
| Recursive — include subdirectories (Recommended) | Component at src/services/ includes src/services/c4/, src/services/reef/, etc. | ✓ |
| Direct children only | Only files directly in the mapped directory | |
| You decide | Claude decides based on diagram quality | |

**User's choice:** Recursive — include subdirectories (Recommended)
**Notes:** None

---

## Diagram Density & Filtering

### Q1: How should code diagrams handle large components?

| Option | Description | Selected |
|--------|-------------|----------|
| Exported-only filter (Recommended) | Only show exported classes, functions, enums. Internal helpers excluded. | ✓ |
| Show everything | All classes, functions, enums regardless of export status | |
| Cap + group by file | Show up to ~20 elements, group remaining into summary note | |
| You decide | Claude picks filtering strategy | |

**User's choice:** Exported-only filter (Recommended)
**Notes:** None

### Q2: Should relationships between elements be shown?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, usage arrows (Recommended) | Show 'uses' arrows based on import analysis. Static analyzer already extracts this. | ✓ |
| No relationships | Just standalone boxes. Simpler, avoids spaghetti. | |
| You decide | Claude decides based on diagram complexity | |

**User's choice:** Yes, usage arrows (Recommended)
**Notes:** None

---

## Empty/Minimal Fallback

### Q1: What should show when a component has no exportable code elements?

| Option | Description | Selected |
|--------|-------------|----------|
| File-list summary diagram (Recommended) | PlantUML note listing files and their types (e.g., "3 type files, 1 config file") | ✓ |
| Informational message only | Simple text note: "No diagrammable code elements found" | |
| Skip generation entirely | Don't generate code-level diagram for empty components | |

**User's choice:** File-list summary diagram (Recommended)
**Notes:** None

---

## Claude's Discretion

- Exact PlantUML syntax for stereotyped classes (color, icon, layout direction)
- How to detect React components from static analysis
- Whether to extract enum values from ts-morph or just show enum names
- Threshold for "too dense" diagrams
- File-list summary note formatting

## Deferred Ideas

None — discussion stayed within phase scope
