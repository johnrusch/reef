# Reef: C4 Architecture Diagrams

## What This Is

A desktop Git client that helps developers visually understand codebases through C4 architecture diagrams. When users load repositories, the app analyzes the code using hybrid static+AI analysis and generates interactive, hierarchical diagrams. Users can navigate from system context down to code-level details through clickable elements, with intelligent caching and automatic staleness detection.

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

### Active

(Defined in REQUIREMENTS.md for v1.1)

## Current Milestone: v1.1 Persistent Diagrams with Change Visualization

**Goal:** Make C4 diagrams a persistent, always-ready feature with real-time architectural change visualization.

**Target features:**
- Auto-generate diagrams when repo added (with user prompt for API cost awareness)
- Permanent diagram storage (no TTL expiration, survives app restarts)
- Real-time change detection with visual indicators that bubble up through C4 levels
- Contextual navigation from changed code-level elements to diff viewer
- Optimized loading (no multi-minute regeneration waits)

### Out of Scope

- UML component diagrams — replaced with C4 approach
- UML class diagrams — replaced with C4 Code level
- Sequence diagrams — not part of C4, defer to future
- Manual diagram editing — generated diagrams only
- Real-time live updates — file change detection on save is sufficient
- Multi-repository combined diagrams — single repository at a time
- Progressive SVG loading for >2MB diagrams — descoped from v1.0

## Context

**Current State (v1.0 shipped):**
- 23,772 lines of TypeScript
- Tech stack: Electron, React, Vite, Tailwind, Zustand, simple-git, Octokit
- C4 stack: ts-morph, @anthropic-ai/sdk v0.78.0, better-sqlite3, chokidar
- UI stack: react-hotkeys-hook, cmdk, fuse.js, Radix UI

**C4 Generation Pipeline:**
- Three-phase architecture: Static Analysis → AI Enrichment → PlantUML Generation
- Prompt caching with cache_control for 90% cost reduction
- Level-aware caching (Context: 7d, Container: 3d, Component: 1d, Code: 6h)
- Smart cache invalidation based on file modification times

**Navigation System:**
- Zustand store tracks navigation stack with push/pop/navigateTo
- Breadcrumb trail with WAI-ARIA accessibility
- SVG click detection with DOM traversal for element IDs
- Command palette for fuzzy search across diagram levels

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
| Level-aware TTL caching | Context changes rarely (7d), Code changes often (6h) | ✓ Good |
| Prompt caching with ephemeral cache_control | 90% cost reduction on repeated analysis | ✓ Good |
| Stack-based navigation with session persistence | Maintains position across refreshes, resets on repo switch | ✓ Good |
| DOM traversal with elem_ prefix stripping | Clean element IDs from PlantUML SVG structure | ✓ Good |
| cmdk + fuse.js for command palette | Accessible, keyboard-navigable with fuzzy search | ✓ Good |
| react-hotkeys-hook for shortcuts | Declarative, cross-platform, input filtering built-in | ✓ Good |

---
*Last updated: 2026-02-24 after v1.1 milestone start*
