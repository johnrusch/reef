# Reef: C4 Architecture Diagrams

## What This Is

A desktop Git client that helps developers visually understand codebases through C4 architecture diagrams. When users load repositories, the app analyzes the code and generates interactive, hierarchical diagrams showing system context, containers, components, and code-level details.

## Core Value

Users can quickly grasp unfamiliar codebase architecture through AI-generated C4 diagrams that update as code changes.

## Requirements

### Validated

- ✓ Desktop Git client with multi-repository management — existing
- ✓ PlantUML diagram rendering infrastructure — existing
- ✓ AI-powered code analysis using Claude API — existing
- ✓ File change detection for repositories — existing
- ✓ Interactive diagram viewing (zoom, pan, fullscreen, export) — existing
- ✓ Diagram caching for performance — existing

### Active

- [ ] C4 Context diagram generation (system in environment, external dependencies)
- [ ] C4 Container diagram generation (high-level tech stack: apps, databases, services)
- [ ] C4 Component diagram generation (components within containers)
- [ ] C4 Code diagram generation (class-level details)
- [ ] C4 hierarchy navigation (drill down from Context → Container → Component → Code)
- [ ] C4 level switching UI controls
- [ ] Hybrid generation approach (static analysis + AI enrichment)
- [ ] Automatic diagram regeneration when files change
- [ ] C4-PlantUML syntax generation
- [ ] Element clickability for drill-down navigation

### Out of Scope

- UML component diagrams — replaced with C4 approach
- UML class diagrams — replaced with C4 Code level
- Sequence diagrams — not part of C4, defer to future
- Manual diagram editing — generated diagrams only
- Real-time live updates — file change detection on save is sufficient
- Multi-repository combined diagrams — single repository at a time

## Context

**Existing Infrastructure:**
- Visual Map Tab already built with settings UI, diagram viewer, and controls
- DiagramGeneratorService handles AI prompts and Claude API calls
- ContextExtractorService analyzes codebase and prioritizes files
- PlantUMLRenderer displays diagrams with zoom/pan/fullscreen
- File change detection monitors repository status
- Caching layer for diagram results

**C4 Model:**
- Hierarchical approach to software architecture visualization
- 4 levels: Context (system boundaries) → Container (tech building blocks) → Component (internal structure) → Code (implementation details)
- Each level drills into more detail
- Uses C4-PlantUML library for standardized notation

**Current Gap:**
- Diagram types are generic UML (component, class, sequence)
- No C4-specific generation logic or prompts
- No hierarchy navigation between C4 levels
- Missing C4-PlantUML syntax in generation

## Constraints

- **Tech Stack**: Must use existing Electron + React + PlantUML infrastructure — don't rebuild rendering
- **Performance**: Large codebases need efficient context extraction — use existing token limits and smart file selection
- **AI Costs**: Balance quality vs cost — keep model selection (Haiku/Sonnet/Opus), default to Haiku
- **Compatibility**: PlantUML server must support C4-PlantUML library — verify or document setup

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Replace existing diagram types with C4 | C4 provides better architectural understanding than generic UML for codebase exploration | — Pending |
| Keep hybrid approach (static + AI) | Static analysis for deterministic structure, AI for architectural insights | — Pending |
| All 4 C4 levels in v1 | Complete hierarchy needed for drill-down navigation to work | — Pending |
| Reuse existing UI components | Visual Map Tab, DiagramViewer, controls already built and working | — Pending |
| File change detection triggers regeneration | Users want diagrams to stay current as code evolves | ✓ Good (already implemented) |

---
*Last updated: 2026-02-21 after initialization*
