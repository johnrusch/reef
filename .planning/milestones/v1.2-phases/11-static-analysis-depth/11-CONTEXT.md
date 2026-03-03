# Phase 11: Static Analysis Depth - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix multi-pass extraction (forgetDescendants bug) and enrich the static analyzer to produce accurate, rich AnalysisResult data for all C4 diagram levels. Add directory-based component grouping and non-TypeScript repo fallback. This phase delivers the data layer — AI enrichment consumption is Phase 12, navigation is Phase 13.

</domain>

<decisions>
## Implementation Decisions

### Diagram element richness
- Only "significant" exported functions become diagram elements — React hooks, service functions, route handlers
- Small utility functions (formatDate, isString) are extracted but metadata-only, not diagram elements
- Use a heuristic to classify function significance (export status, naming conventions, file location)
- Decorators set element roles — framework decorators (@Controller, @Injectable, @Component) map to architectural role labels on diagram elements
- React components get `<<Component>>` stereotype, hooks get `<<Hook>>` stereotype — makes diagrams framework-aware

### Component grouping labels
- Semantic role mapping — map common directory conventions to architectural labels (e.g., 'services' → "Service Layer", 'controllers' → "API Controllers", 'stores' → "State Management")
- Unrecognized directories use their directory name as fallback group label (e.g., 'c4/' → "c4")
- File-structure quality indicator — when diagrams are generated from file structure (not full AST), show a badge: "Generated from file structure — add TypeScript for richer analysis"

### Non-TypeScript repo handling
- File-structure analysis + AI enrichment — analyze directory layout and file names to infer components, pass to AI in Phase 12
- For plain JavaScript repos: parse .js/.jsx files with ts-morph (it can handle JS without tsconfig) to extract structural data
- For non-JS repos (Python, etc.): file-structure-only analysis — directory layout, file names, and any available metadata
- Partial results with warning on failure — show whatever was successfully parsed with a count like "23 of 45 files analyzed". Never crash, always produce something
- Show quality indicator badge when diagram was generated from file structure rather than full AST

### Code-level diagram scope
- Public API only — only exported/public methods and properties shown. Private internals hidden
- Function signatures show return type only: `analyzeProject(): Promise<AnalysisResult>`. Parameters omitted for brevity
- Cap at ~15 elements per Code diagram — show most important first (exported, then by usage), add "... and N more" overflow note
- React components and hooks get framework-specific stereotypes (`<<Component>>`, `<<Hook>>`)

### Claude's Discretion
- JSDoc annotation handling — how JSDoc feeds into diagram content (descriptions, classification, both, or neither)
- Type alias and enum visibility — whether they become diagram elements or stay as metadata
- Directory nesting depth for component grouping — flat vs two-level vs adaptive
- Root file grouping strategy — whether root-level files get their own group
- Loading skeleton and exact error state designs
- Specific threshold for "significant" function heuristic

</decisions>

<specifics>
## Specific Ideas

- Decorator-to-role mapping should feel like reading architecture documentation, not code ("Service Layer" not "services/")
- Quality indicator for non-TS repos should be helpful, not apologetic — "Generated from file structure" with a suggestion to add TypeScript
- The ~15 element cap should prioritize exported symbols first, then sort by apparent importance (referenced by other files)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StaticAnalyzerService` (`src/main/services/c4/staticAnalyzerService.ts`): Current ts-morph-based analyzer — needs bug fix and enrichment, not replacement
- `AnalysisResult` types (`src/main/services/c4/types/analysisTypes.ts`): Need extension for functions, decorators, JSDoc, directory groupings
- `c4AnalyzerService.ts`: Orchestrates analysis flow — integration point for enriched data
- `c4PlantUMLGenerator.ts`: Consumes AnalysisResult to produce diagrams — must understand new data shape
- Technology detection in `detectTechnologies()`: Already reads package.json — can inform framework-specific heuristics

### Established Patterns
- Service classes register IPC handlers in constructor — new analysis capabilities follow same pattern
- ts-morph used with `skipFileDependencyResolution: true` for performance — must maintain this
- `forgetDescendants()` used for memory optimization but currently called BEFORE extraction (the bug to fix)
- Error handling returns empty result with error message — extend pattern for partial results

### Integration Points
- `diagramGeneratorServiceV2.ts`: Calls static analyzer — will receive enriched AnalysisResult
- `aiEnricherService.ts`: Receives analysis data for AI enrichment (Phase 12 consumer)
- `contextExtractorServiceV2.ts`: May share file-scanning logic for non-TS fallback
- `cacheService.ts`: Caches diagram results — new data shape must be cache-compatible

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-static-analysis-depth*
*Context gathered: 2026-03-02*
