# Reef: C4 Architecture Diagrams

## What This Is

A desktop Git client that helps developers visually understand codebases through persistent, interactive C4 architecture diagrams. When users add repositories, the app prompts for diagram generation, analyzes code using hybrid static+AI analysis, and generates hierarchical diagrams that persist across sessions. File changes are tracked and visualized in real-time with amber highlighting that propagates through C4 levels, and users can navigate from changed diagram elements directly to code diffs.

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
- ✓ C4 Context diagram generation (system in environment, external dependencies) — v1.0
- ✓ C4 Container diagram generation (high-level tech stack: apps, databases, services) — v1.0
- ✓ C4 Component diagram generation (components within containers) — v1.0
- ✓ C4 Code diagram generation (class-level details) — v1.0
- ✓ C4 hierarchy navigation (drill down from Context → Container → Component → Code) — v1.0
- ✓ C4 level switching UI controls — v1.0
- ✓ Hybrid generation approach (static analysis + AI enrichment) — v1.0
- ✓ Automatic diagram regeneration when files change — v1.0
- ✓ C4-PlantUML syntax generation — v1.0
- ✓ Element clickability for drill-down navigation — v1.0
- ✓ Keyboard shortcuts (F, Escape, Cmd+R, arrows) — v1.0
- ✓ Command palette with fuzzy search (Cmd/Ctrl+K) — v1.0
- ✓ Persistent diagram storage with SQLite WAL mode — v1.1
- ✓ Automatic v1.0 TTL-to-persistent migration — v1.1
- ✓ Diagram state tracking (never_generated, generating, fresh, stale, error) — v1.1
- ✓ Auto-generation prompt on repo add with cost awareness — v1.1
- ✓ Background generation queue with progress tracking — v1.1
- ✓ Toast notifications for generation completion/errors — v1.1
- ✓ File-to-element change mapping across C4 levels — v1.1
- ✓ Hierarchy change propagation (Code → Component → Container) — v1.1
- ✓ Amber SVG highlighting for changed elements — v1.1
- ✓ Change count badges with file-list tooltips — v1.1
- ✓ Diagram-to-diff navigation with context banner — v1.1
- ✓ Back-to-diagram flow with position restoration — v1.1

### Active

(No active milestone — use `/gsd:new-milestone` to define v1.2)

### Out of Scope

- UML component diagrams — replaced with C4 approach
- UML class diagrams — replaced with C4 Code level
- Sequence diagrams — not part of C4, defer to future
- Manual diagram editing — generated diagrams only
- Real-time live updates — file change detection on save is sufficient
- Multi-repository combined diagrams — single repository at a time
- Progressive SVG loading for >2MB diagrams — descoped from v1.0
- Automatic background regeneration — silent API costs, no user control over spending
- Inline diff overlay on diagram — mixes architecture/code concerns, becomes unreadable
- Commit-linked diagram snapshots — high complexity, defer to v1.2+

## Context

**Current State (v1.1 shipped):**
- 29,938 lines of TypeScript
- Tech stack: Electron, React, Vite, Tailwind, Zustand, simple-git, Octokit
- C4 stack: ts-morph, @anthropic-ai/sdk v0.78.0, better-sqlite3, chokidar
- UI stack: react-hotkeys-hook, cmdk, fuse.js, Radix UI
- Storage: SQLite with WAL mode, diagram_storage + diagram_change_tracking tables
- Generation: Background queue with IPC progress events, toast notifications

**C4 Generation Pipeline:**
- Three-phase architecture: Static Analysis → AI Enrichment → PlantUML Generation
- Prompt caching with cache_control for 90% cost reduction
- Persistent storage (no TTL expiration), user-controlled regeneration
- Background generation queue with per-level progress tracking

**Change Detection & Visualization:**
- chokidar v4 directory-based file watching with extension filtering
- ChangeTrackingService: file-to-element mapping with hierarchy propagation
- SVG injection: amber fill (direct changes), dashed border (inherited changes)
- ChangeBadge with file-list tooltip in portal for overflow escape

**Navigation System:**
- Zustand store tracks navigation stack with push/pop/navigateTo
- Diagram-to-diff: diagramNavigationStore intent → CommitWorkflowTab consumption
- Context banner in DiffViewer with back-to-diagram button
- Breadcrumb trail with WAI-ARIA accessibility
- Command palette for fuzzy search across diagram levels

**Known Tech Debt (from v1.1 audit):**
- 20 human verification tests pending
- handleRegenerateFromBadge missing IPC state transitions (medium UX gap)
- Static cost estimate (getCostEstimate IPC exists but not called)
- Debug console.log in PlantUMLRenderer.tsx and CommitWorkflowTab.tsx
- Deferred: CHNG-01 (file watching stale indicator), CHNG-04 (debounce aggregation)

## Constraints

- **Tech Stack**: Must use existing Electron + React + PlantUML infrastructure
- **Performance**: Large codebases need efficient context extraction using token limits
- **AI Costs**: Prompt caching reduces costs 90%; default to Haiku model
- **Compatibility**: PlantUML server supports C4-PlantUML via stdlib includes

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Replace existing diagram types with C4 | C4 provides better architectural understanding than generic UML | ✓ Good |
| Keep hybrid approach (static + AI) | Static analysis for deterministic structure, AI for architectural insights | ✓ Good |
| All 4 C4 levels in v1 | Complete hierarchy needed for drill-down navigation | ✓ Good |
| Reuse existing UI components | Visual Map Tab, DiagramViewer, controls already built | ✓ Good |
| File change detection triggers regeneration | Users want diagrams to stay current as code evolves | ✓ Good |
| Use ts-morph for static analysis | High reputation library, 790 code examples, TypeScript-native | ✓ Good |
| Prompt caching with ephemeral cache_control | 90% cost reduction on repeated analysis | ✓ Good |
| Stack-based navigation with session persistence | Maintains position across refreshes, resets on repo switch | ✓ Good |
| DOM traversal with elem_ prefix stripping | Clean element IDs from PlantUML SVG structure | ✓ Good |
| cmdk + fuse.js for command palette | Accessible, keyboard-navigable with fuzzy search | ✓ Good |
| react-hotkeys-hook for shortcuts | Declarative, cross-platform, input filtering built-in | ✓ Good |
| Remove TTL, persistent storage | v1.1: Diagrams persist indefinitely, user controls regeneration | ✓ Good |
| SQLite WAL mode for concurrent reads | v1.1: Multiple readers during generation, no blocking | ✓ Good |
| Background generation queue | v1.1: Non-blocking UI, progress events via IPC | ✓ Good |
| chokidar v4 directory watching | v1.1: Glob support removed; directory paths + extension filtering | ✓ Good |
| SVG style injection for change highlighting | v1.1: !important overrides inline PlantUML attributes | ✓ Good |
| Intent-based cross-tab navigation | v1.1: Zustand intent store consumed once, prevents stale navigation | ✓ Good |
| Singleton C4StorageService | v1.1: All writes through one instance, consistent IPC broadcasts | ✓ Good |

---
*Last updated: 2026-02-28 after v1.1 milestone completion*
