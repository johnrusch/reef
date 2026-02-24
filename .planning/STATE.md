# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Users can quickly grasp unfamiliar codebase architecture through AI-generated C4 diagrams that update as code changes
**Current focus:** Phase 4 - Polish & Advanced Features

## Current Position

Phase: 4 of 4 (Polish & Advanced Features)
Plan: 2 of 2 in current phase
Status: Complete
Last activity: 2026-02-24 — Completed plan 04-02

Progress: [████████████████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: 5.6 minutes
- Total execution time: 1.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-c4-foundation | 5 | 22m | 4.4m |
| 02-automatic-regeneration | 2 | 9m | 4.5m |
| 03-hierarchy-navigation | 2 | 9m | 4.5m |
| 04-polish-advanced-features | 1 | 7m | 7.0m |

**Recent Trend:**
- Last 5 plans: 02-01 (5m), 02-02 (4m), 03-01 (4m), 03-02 (4m), 04-01 (7m)
- Trend: Consistent execution with slightly longer polish tasks

*Updated after each plan completion*
| Phase 04 P02 | 14 | 3 tasks | 8 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- DOM traversal with elem_ prefix stripping for PlantUML ID detection — Extracts clean element identifiers from SVG click events (Phase 03, Plan 02)
- Optimistic navigation with error rollback — Push navigation immediately, pop on regeneration failure (Phase 03, Plan 02)
- Code level diagrams not clickable — Cannot drill down further from code level (Phase 03, Plan 02)
- Stack-based navigation model for C4 hierarchy — context > container > component > code with push/pop/navigateTo actions (Phase 03, Plan 01)
- Persist navigation state in session storage — Maintain user's position in diagram hierarchy across page refreshes (Phase 03, Plan 01)
- Reset navigation stack when switching repositories — Prevent cross-repo state contamination (Phase 03, Plan 01)
- WAI-ARIA compliant breadcrumbs — Accessible navigation for screen readers and keyboard users (Phase 03, Plan 01)
- Breadcrumbs only for C4 diagrams — Legacy UML diagram types don't support hierarchical navigation (Phase 03, Plan 01)
- Singleton pattern with factory functions for FileWatcherService — Ensures proper cache service injection (Phase 02, Plan 01)
- Chokidar with 100ms debounce for file watching — Optimal balance between responsiveness and stability (Phase 02, Plan 01)
- Level-specific file patterns for staleness detection — Context/container/component/code each watch relevant files only (Phase 02, Plan 01)
- Use @electron/rebuild instead of electron-rebuild — Official replacement supports Electron 38.8.2 and ABI 139, deprecated package failed (Phase 01, Plan 05)
- Container ID naming matches PlantUML element IDs — reef_main, reef_renderer, reef_preload ensure frontend-backend ID consistency (Phase 01, Plan 04)
- Progressive disclosure for drill-down selectors — Show container/component dropdowns only when relevant diagram type selected (Phase 01, Plan 04)
- Use claude-sonnet-4-5-20250929 for AI enrichment — Current flagship model for best architectural insights (Phase 01, Plan 03)
- Implement prompt caching with ephemeral cache_control — 90% cost savings on repeated analysis (Phase 01, Plan 03)
- Level-specific system prompts for architectural guidance — Context/Container/Component/Code each need different focus (Phase 01, Plan 03)
- SQLite-based caching for persistence — better-sqlite3 enables cache across sessions (Phase 01, Plan 03)
- Smart cache invalidation based on file mtimes — Check relevant file patterns per C4 level (Phase 01, Plan 03)
- Three-phase pipeline architecture — Separates static analysis, AI enrichment, and PlantUML generation (Phase 01, Plan 03)
- Replace existing diagram types with C4 — C4 provides better architectural understanding than generic UML for codebase exploration (Phase 01, Plan 02)
- Keep hybrid approach (static + AI) — Static analysis for deterministic structure, AI for architectural insights (Phase 01, Plan 02)
- All 4 C4 levels in v1 — Complete hierarchy needed for drill-down navigation to work (Phase 01, Plan 02)
- C4 cache TTL by abstraction level — 7d/3d/1d/6h based on change frequency (Phase 01, Plan 02)
- Hierarchical ID structure for drill-down — systemId → containerId → componentId → classId (Phase 01, Plan 02)
- Selective file loading pattern — src/**/*.{ts,tsx} to optimize performance (Phase 01, Plan 02)
- Use ts-morph for static analysis — High reputation library with 790 code examples (Phase 01, Plan 01)
- Upgrade SDK to v0.78.0 for prompt caching — 90% cost reduction on repeated content (Phase 01, Plan 01)
- Whitelist-based security for C4 includes — Official stdlib only, reject arbitrary includes (Phase 01, Plan 01)
- [Phase 02]: Yellow badge (yellow-600) for staleness indicator - High visibility without being alarming
- [Phase 02]: Badge click triggers regeneration with optimistic UI - Single-click interaction for better perceived performance
- [Phase 02]: File watcher only starts for C4 diagrams - Other diagram types don't support staleness yet
- [Phase 04]: Use react-hotkeys-hook for declarative keyboard shortcuts - provides built-in input filtering and cross-platform support
- [Phase 04]: Left arrow for breadcrumb navigation - natural mapping for going back in hierarchy
- [Phase 04]: Use cmdk for command palette with fuzzy search - provides accessible keyboard-navigable dialog
- [Phase 04]: 300ms debounce on fuzzy search - prevents excessive re-renders as user types

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 04-polish-advanced-features/04-01-PLAN.md
Resume file: None
