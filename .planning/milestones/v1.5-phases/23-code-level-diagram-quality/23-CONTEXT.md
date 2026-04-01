# Phase 23: Code-Level Diagram Quality - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Users see meaningful class structure in code-level diagrams from static analysis alone. Exported functions, React components, enums, classes, and interfaces all appear with appropriate UML representation. Code elements are matched to their parent component via directory mapping, and empty components show a file-list summary rather than a blank diagram.

</domain>

<decisions>
## Implementation Decisions

### Non-Class Code Representation
- **D-01:** Exported functions render as stereotyped UML classes with `<<function>>` stereotype — parameters shown as properties, return type shown below a separator
- **D-02:** React functional components detected (return JSX, use hooks) and shown with `<<component>>` stereotype — props as properties, hooks listed in a separate section
- **D-03:** Enums render with `<<enumeration>>` stereotype showing enum values. Type aliases are excluded from code-level diagrams.

### Component-to-Code Matching
- **D-04:** Directory-based matching — reuse the same directory-to-component mapping from component-level generation. All classes/functions/enums in that directory belong to the component.
- **D-05:** Recursive inclusion — subdirectories of the component directory are included (e.g., `src/services/` includes `src/services/c4/`, `src/services/reef/`, etc.)

### Diagram Density & Filtering
- **D-06:** Exported-only filter — only exported classes, functions, components, and enums appear in code diagrams. Internal/private helpers are excluded.
- **D-07:** Usage relationships (import-based arrows) shown between elements. The static analyzer already extracts import data to support this.

### Empty/Minimal Fallback
- **D-08:** When a component has no exportable code elements, generate a PlantUML diagram with a note listing the files in the directory and their types (e.g., "3 type files, 1 config file"). User sees the component exists but has no diagrammable code.

### Claude's Discretion
- Exact PlantUML syntax for stereotyped classes (color, icon, layout direction)
- How to detect React components from static analysis (JSX return type, hook calls)
- Whether to extract enum values from ts-morph or just show enum names
- Threshold for when a diagram is "too dense" and needs layout adjustments
- How to format the file-list summary note for empty components

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Static Analysis
- `src/main/services/c4/staticAnalyzerService.ts` — ts-morph based analyzer that extracts ClassInfo, InterfaceInfo, FunctionInfo, imports, exports
- `src/main/services/c4/types/analysisTypes.ts` — Type definitions for AnalysisResult, ProjectStructure, ClassInfo, InterfaceInfo, FunctionInfo, ComponentGroup

### PlantUML Generation
- `src/main/services/c4/c4PlantUMLGenerator.ts` — `generateCodeDiagram()` at line 380 is the primary target. Also see `extractUsageRelationships()` for existing relationship extraction logic
- `src/main/services/c4/c4AnalyzerService.ts` — Orchestrates analysis, maps directories to components via ComponentGroup

### Type System
- `src/main/services/c4/types/c4Types.ts` — C4 level types and shared type definitions
- `src/main/services/c4/types/enrichmentTypes.ts` — AI enrichment types (code level does NOT use these, but signature compatibility required)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `extractClasses()` in staticAnalyzerService.ts — already extracts name, methods, properties, extends, implements, decorators, description, isExported
- `extractInterfaces()` — extracts properties with types, extends, isExported
- `FunctionInfo` type — already has name, file, parameters, returnType, isExported, isAsync, decorators, description
- `extractUsageRelationships()` in c4PlantUMLGenerator.ts — existing import-based relationship extraction
- `ComponentGroup` type — has directory path, classCount, functionCount for directory-to-component mapping
- `DIRECTORY_ROLE_MAP` — maps directory names to semantic labels, used in component grouping

### Established Patterns
- Code-level generator uses static analysis only (AI enrichment intentionally excluded) — this is by design, not a bug
- PlantUML syntax: other levels use C4-PlantUML includes, but code level uses standard UML class diagram syntax
- Component-level generation already groups files by directory via `ComponentGroup` — same mapping can be reused

### Integration Points
- `generateCodeDiagram(enrichedData, staticData, componentId)` — signature must remain compatible (enrichedData accepted but unused)
- `staticData.structure.functions` — already populated by analyzer but not consumed by code generator
- `staticData.structure.classes[].isExported` — filter field already available
- `.reef/` write-through — code diagrams are stored like all other levels, no special handling needed

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-code-level-diagram-quality*
*Context gathered: 2026-03-31*
