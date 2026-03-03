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

## Milestone: v1.2 — Diagrams That Deliver

**Shipped:** 2026-03-03
**Phases:** 4 | **Plans:** 9

### What Was Built
- Fixed multi-pass static analysis extraction (forgetDescendants bug), enriched with functions, decorators, JSDoc, directory-based component grouping
- AI enrichment pipeline with Zod structured schemas, framework-aware prompts, and PlantUML generator consumption
- End-to-end drill-down navigation via ElementIdRegistry, dynamic container-to-path resolution, SVG click transparency fix, elementId passthrough closure
- Two-tier SVG caching (15-entry LRU + SQLite storage) for sub-500ms cached diagram display, Nailgun warm JVM feature flag

### What Worked
- Dependency-driven phase ordering (11→12→13→14): each phase consumed exactly what the previous produced, zero integration rework
- Plan 13-03 gap closure pattern (from v1.1 lesson): UAT caught elementId passthrough bug, small focused plan fixed it in one commit
- Milestone audit before completion: identified bookkeeping gaps (SUMMARY frontmatter) vs real gaps, gave confidence to ship
- 2-day execution for 4 phases / 9 plans — tightest scope yet, every plan directly targeted a specific user-visible problem

### What Was Inefficient
- SUMMARY frontmatter bookkeeping gaps (12-01, 13-02 missing requirements_completed) — the automation should enforce this
- Nyquist validation partial/missing for all 4 phases — VALIDATION.md files not generated consistently
- 7 human verification tests accumulated — same pattern as v1.1, no process to run these during development

### Patterns Established
- ElementIdRegistry as shared canonical ID source: one register/lookup API used by generators, storage, and click handlers
- AI fallback to static: `enrichArchitecture()` catches errors, logs warning, returns null — downstream always gets a diagram
- Two-tier caching: LRU for in-session speed, SQLite for cross-session persistence
- Zod zodOutputFormat for structured AI output: eliminates free-text parsing, schema validates at generation time

### Key Lessons
1. 2-day milestones are viable when phase scope is tight and dependencies are linear — each phase had exactly 2-3 plans
2. Gap closure plans (13-03) are predictable and cheap — UAT should run after every phase, not just at milestone end
3. SUMMARY frontmatter bookkeeping should be automated or enforced by tooling — manual tracking creates false audit gaps
4. Nyquist validation needs to be part of phase completion workflow, not a separate optional step

### Cost Observations
- Model mix: predominantly sonnet for execution, opus for planning/audit/milestone
- Notable: Fastest milestone yet (2 days vs 4 days for v1.0 and v1.1)

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Timeline | Key Change |
|-----------|--------|-------|----------|------------|
| v1.0 | 4 | 11 | 4 days | Initial GSD workflow, TDD scaffolds |
| v1.1 | 6 | 19 | 4 days | Gap closure phases, audit-driven completion |
| v1.2 | 4 | 9 | 2 days | Tight scope per phase, dependency-driven ordering |

### Top Lessons (Verified Across Milestones)

1. Audit before milestone completion catches integration gaps that individual phase verification misses (v1.1, v1.2)
2. Small, focused phases (1-3 plans) execute faster and more reliably than large phases (v1.1 Phase 5 vs v1.2 all phases)
3. Gap closure plans after UAT are predictable and cheap — budget one per milestone (v1.1 Phase 10, v1.2 Plan 13-03)
4. Human verification tests accumulate without a forcing function — need process change (v1.1: 20 items, v1.2: 7 items)
