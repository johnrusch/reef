# Reef: C4 Architecture Diagrams

## What This Is

A desktop Git client that helps developers visually understand codebases through persistent, interactive C4 architecture diagrams. When users add repositories, the app analyzes code using hybrid static+AI analysis with structured Zod schemas and framework-aware prompts, generates rich hierarchical diagrams that persist across sessions with sub-500ms cached rendering. File changes are tracked and visualized with amber highlighting that propagates through C4 levels, and users can drill down from Context to Code level with reliable click navigation through a canonical ElementIdRegistry.

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
- ✓ Multi-pass static analysis with functions, decorators, JSDoc extraction — v1.2
- ✓ Directory-based component grouping with architectural role labels — v1.2
- ✓ Non-TypeScript repo fallback (JavaScript, file-structure heuristics) — v1.2
- ✓ Structured AI enrichment with Zod schemas and framework-aware prompts — v1.2
- ✓ AI-provided component/container names consumed by PlantUML generator — v1.2
- ✓ ElementIdRegistry for consistent IDs across generation, storage, navigation — v1.2
- ✓ Dynamic container-to-path resolution for any repo structure — v1.2
- ✓ SVG click transparency fix for all PlantUML JAR versions — v1.2
- ✓ Sub-500ms cached diagram display via SQLite SVG storage — v1.2
- ✓ In-process LRU cache for instant diagram level switching — v1.2
- ✓ Nailgun warm JVM mode (feature-flagged) — v1.2
- ✓ Clean diagram view with all legacy configuration/metadata controls removed — v1.3
- ✓ C4HierarchyTree sidebar with collapsible 4-level navigation — v1.3
- ✓ Breadcrumb navigation showing current C4 hierarchy position — v1.3
- ✓ Sidebar auto-highlight on drill-down navigation — v1.3
- ✓ Single-button "Generate All Diagrams" flow for first-visit — v1.3
- ✓ Minimal 2-button toolbar (Regenerate + Show/Hide Changes) — v1.3
- ✓ `.reef/` folder structure with ReefStorageService (atomic writes, schema validation, .gitattributes) — v1.4
- ✓ Chokidar `.reef/` exclusion preventing false file-change events — v1.4
- ✓ Automatic `.reef/` write-through on diagram generation (store-svg handler writes .puml, .svg, .meta.json) — v1.4
- ✓ Source hash computation (SHA-256 of analyzed files) in `.meta.json` for staleness detection — v1.4
- ✓ On repo import, read existing `.reef/` data instead of regenerating diagrams from scratch — v1.4
- ✓ Instant diagram display from stored SVGs (bypass PlantUML rendering via LRU cache population) — v1.4
- ✓ Consistent diagrams across team members sharing the same repository — v1.4
- ✓ Hash-based staleness detection comparing sourceHash against .meta.json — v1.4
- ✓ Stale-aware regeneration (skip fresh levels, confirmation dialog with stale count) — v1.4
- ✓ Cache-first navigation — all navigation checks SVG cache → PlantUML source before generating — Validated in Phase 21
- ✓ Full Generate All — upfront generation of all 4 C4 levels with auto-discovered elementIds — Validated in Phase 21
- ✓ .reef/ preservation during navigation — loadDiagram is read-only, never writes — Validated in Phase 21
- ✓ Resizable sidebar with drag handle and persist width via localStorage — Validated in Phase 22
- ✓ Active C4 level highlight with blue left-border accent strip — Validated in Phase 22
- ✓ Breadcrumb level suffix showing C4 level in parentheses — Validated in Phase 22
- ✓ Nested element tree in sidebar with drill-down from .reef/ PlantUML data — Validated in Phase 22
- ✓ Meaningful code-level diagrams from static analysis (function params, enums, React components) — Validated in Phase 23

### Active

(None — planning next milestone)

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
- Commit-linked diagram snapshots — high complexity, defer to future
- Multi-language AST parsing (Python, Go, Java) — each needs separate parser, AI-only mode sufficient for now
- Show all classes as components — 50+ nodes unreadable; C4 Component level is for logical groupings
- Full class diagrams with all methods — Code level shows public API only (max 8-10 methods)

## Shipped Milestones

- v1.0 C4 Diagram Feature Release (2026-02-24)
- v1.1 Persistent Diagrams with Change Visualization (2026-02-28)
- v1.2 Diagrams That Deliver (2026-03-03)
- v1.3 Diagram Explorer (2026-03-06)
- v1.4 Repo-Stored Diagrams (2026-03-28)
- v1.5 Bug Fixes & Navigation Overhaul (2026-04-01)

See `.planning/MILESTONES.md` for full details.

## Context

**Current State (v1.5 shipped):**
- ~45,000 lines of TypeScript
- Tech stack: Electron, React, Vite, Tailwind, Zustand, simple-git, Octokit
- C4 stack: ts-morph, @anthropic-ai/sdk v0.78.0, better-sqlite3, chokidar, zod
- UI stack: react-hotkeys-hook, cmdk, fuse.js, Radix UI, lucide-react
- Storage: SQLite with WAL mode, diagram_storage (with svg_content column) + diagram_change_tracking tables
- Generation: Background queue with IPC progress events, toast notifications
- Caching: Two-tier cache (15-entry LRU in-process + SQLite SVG storage)
- Navigation: Cache-first loadDiagram (read-only, never generates), C4HierarchyTree sidebar (resizable via react-resizable-panels, element tree with IPC drill-down) + breadcrumbs with level suffix + Zustand selector pattern
- Code diagrams: Stereotyped rendering (<<function>>, <<component>>, <<enumeration>>) with directory-prefix matching and empty fallback

**C4 Generation Pipeline:**
- Three-phase architecture: Static Analysis → AI Enrichment → PlantUML Generation
- Static analysis: multi-pass extraction with functions (params, return types), enums (members, values), decorators, JSDoc, directory-based component grouping
- AI enrichment: structured Zod schemas per level, framework-aware prompts (React, Express, Electron, etc.)
- Prompt caching with cache_control for 90% cost reduction
- Persistent storage with pre-rendered SVG for sub-500ms cached display
- Background generation queue with per-level progress tracking

**Change Detection & Visualization:**
- chokidar v4 directory-based file watching with extension filtering
- ChangeTrackingService: file-to-element mapping with hierarchy propagation
- SVG injection: amber fill (direct changes), dashed border (inherited changes)
- ChangeBadge with file-list tooltip in portal for overflow escape

**Navigation System:**
- ElementIdRegistry: canonical element IDs shared across generation, storage, and click detection
- Dynamic container-to-path resolution (entryPoints → classes → groups → lowercase fallback)
- extractElementIdFromClick: exported helper with transparent overlay skip for all PlantUML versions
- Zustand store tracks navigation stack with push/pop/navigateTo
- Diagram-to-diff: diagramNavigationStore intent → CommitWorkflowTab consumption
- Context banner in DiffViewer with back-to-diagram button
- Breadcrumb trail with WAI-ARIA accessibility
- Command palette for fuzzy search across diagram levels

**Repo-Stored Diagrams (.reef/):**
- ReefStorageService: atomic writes, schema validation, lazy directory creation
- Write-through: store-svg handler auto-writes .puml, .svg, .meta.json after generation
- Import: .reef/ artifacts loaded into LRU + SQLite on repo add, bypassing PlantUML
- Staleness: Hash-based detection (SHA-256 sourceHash vs .meta.json), 2.5s debounce
- Regeneration: Stale-aware UI skips fresh levels, confirmation with stale count

**Known Tech Debt (accumulated):**
- v1.1: 20 human verification tests pending, handleRegenerateFromBadge missing IPC state transitions, static cost estimate not wired, debug console.log statements, CHNG-01/CHNG-04 deferred
- v1.2: modelUsed hardcoded as 'haiku', Anthropic SDK type cast workaround, better-sqlite3 native module mismatch, SUMMARY frontmatter bookkeeping gaps
- v1.3: GEN-01 partial (component/code generation needs elementId from drill-down), DiagramViewer.uicl.test.tsx Zustand mock regression, VisualMapTab.gen01.test.tsx timeout, DiagramInfo.tsx dead code not deleted
- v1.4: STOR-03 hasNewerFiles startup walk omits .reef, REGEN-01 async write-back timing (toast fires before .reef/ updated)
- v1.5: SIDE-03 partial — sidebar element tree shows "No elements cached" at component/code levels (by design, PlantUML macros don't expose child IDs)

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
| Zod structured output for AI enrichment | v1.2: messages.parse + zodOutputFormat ensures typed JSON, no free-text | ✓ Good |
| ElementIdRegistry as plain class (not singleton) | v1.2: Callers control lifecycle, pass registry to generators | ✓ Good |
| Two-tier SVG caching (LRU + SQLite) | v1.2: In-process for instant, SQLite for persistence across restarts | ✓ Good |
| Nailgun warm JVM behind feature flag | v1.2: Opt-in for power users, safe default off | ✓ Good |
| AI failure logs warning, continues with static fallback | v1.2: Diagrams always produced even when AI unavailable | ✓ Good |
| Remove settings landing page, legacy toolbar, DiagramInfo sidebar | v1.3: Clear canvas for browse-first explorer UX | ✓ Good |
| C4HierarchyTree with local useState for collapse | v1.3: Minimizes shared state, sidebar is self-contained | ✓ Good |
| Zustand field-level selectors over full store subscription | v1.3: Reactive highlight updates on drill-down navigation | ✓ Good |
| generateAllDiagrams bypasses component state | v1.3: Avoids React re-render churn during multi-level async generation | ✓ Good |
| GEN-01 partial (component/code require elementId) | v1.3: Deferred; resolved in Phase 21 via extractElementIds auto-discovery | ✓ Good |
| Cache-first loadDiagram + skipLoadEffect ref | v1.5: Read-only cache path prevents double-load race and .reef/ corruption | ✓ Good |
| .reef/ folder for diagram sharing | v1.4: Team diagrams via git, instant import, no regeneration | ✓ Good |
| Atomic temp-then-rename writes | v1.4: Prevents corrupted .reef/ files on crash/interrupt | ✓ Good |
| SHA-256 sourceHash for staleness | v1.4: Precise hash comparison vs unreliable mtime | ✓ Good |
| Dependency injection for ReefStorageService | v1.4: Testable without filesystem; constructor params not singletons | ✓ Good |
| Additive staleness (hash alongside mtime) | v1.4: Hash for .reef/, mtime for SQLite — both paths preserved | ✓ Good |

---
## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-01 after v1.5 milestone*
