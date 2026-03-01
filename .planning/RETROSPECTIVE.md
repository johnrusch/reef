# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Persistent Diagrams with Change Visualization

**Shipped:** 2026-02-28
**Phases:** 6 | **Plans:** 19

### What Was Built
- Persistent SQLite storage replacing TTL-based caching, with automatic v1.0 migration
- Auto-generation prompt on repository add with background queue, progress tracking, toast notifications
- File-to-C4-element change tracking with hierarchy propagation (Code → Component → Container)
- Amber SVG highlighting and change count badges with file-list tooltips
- Diagram-to-diff navigation with context banner, back-to-diagram flow, and file highlighting
- Integration gap closure phase for state transitions, singleton storage, dead listener cleanup

### What Worked
- Phase 10 gap closure pattern: audit identified 3 integration issues, dedicated gap closure phase fixed all three efficiently (83s single plan)
- .todo test scaffolds (Phase 5 Wave 0): defining expected behavior before implementation caught design issues early
- Consistent .getState() pattern across phases 6-9: prevented Zustand re-subscription bugs in IPC callbacks
- chokidar v4 migration (Phase 7-03): quick gap closure after discovering glob incompatibility — directory-based watching is more reliable
- 4-day velocity for 6 phases / 19 plans — tight scope per phase kept momentum high

### What Was Inefficient
- Phase 5 had 8 plans including 3 gap closures — initial scope underestimated integration complexity
- Cost estimate is static text despite getCostEstimate IPC handler existing — feature not connected during Phase 6
- 20 human verification tests accumulated across phases 5-9 without resolution — UAT backlog grew unchecked
- Debug console.log statements left in production code (PlantUMLRenderer, CommitWorkflowTab) — no lint rule catches these

### Patterns Established
- Gap closure as dedicated phase: when audit finds integration issues, create a small phase rather than retrofitting
- Intent-based cross-tab navigation: Zustand intent store → consumer useEffect → single consumption prevents stale navigation
- SVG style injection with data attributes: !important overrides for inline PlantUML presentation attributes
- Function predicate for chokidar v4 ignored option: string matchers use exact equality, not glob expansion
- Portal-based tooltips for overflow-hidden containers: getBoundingClientRect positioning without Radix dependency

### Key Lessons
1. Integration issues between phases are predictable — audit before milestone completion catches them early
2. chokidar v4 broke glob compatibility silently (no error, just no matches) — always verify watcher behavior after library upgrades
3. Zustand .getState() in IPC callbacks is essential — exhaustive-deps lint wants store subscriptions but IPC handlers need point-in-time reads
4. Background generation needs explicit state transitions — fire-and-forget patterns lose UI feedback

### Cost Observations
- Model mix: predominantly sonnet for execution, opus for planning/audit
- Notable: Phase 10 (gap closure) was fastest phase at 83s — small focused scope with clear integration targets

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Timeline | Key Change |
|-----------|--------|-------|----------|------------|
| v1.0 | 4 | 11 | 4 days | Initial GSD workflow, TDD scaffolds |
| v1.1 | 6 | 19 | 4 days | Gap closure phases, audit-driven completion |

### Top Lessons (Verified Across Milestones)

1. Audit before milestone completion catches integration gaps that individual phase verification misses
2. Small, focused phases (1-3 plans) execute faster and more reliably than large phases (8 plans)
