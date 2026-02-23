# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Users can quickly grasp unfamiliar codebase architecture through AI-generated C4 diagrams that update as code changes
**Current focus:** Phase 2 - Automatic Regeneration

## Current Position

Phase: 2 of 4 (Automatic Regeneration)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-02-23 — Completed plan 02-01

Progress: [████████████░░] 60%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 4.5 minutes
- Total execution time: 0.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-c4-foundation | 5 | 22m | 4.4m |
| 02-automatic-regeneration | 1 | 5m | 5.0m |

**Recent Trend:**
- Last 5 plans: 01-02 (7m), 01-03 (9m), 01-04 (2m), 01-05 (2m), 02-01 (5m)
- Trend: Stabilizing at 2-9m per plan

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-23
Stopped at: Completed 02-automatic-regeneration/02-01-PLAN.md
Resume file: None
