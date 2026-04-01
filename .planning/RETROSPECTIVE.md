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

## Milestone: v1.3 — Diagram Explorer

**Shipped:** 2026-03-06 (archived 2026-03-26)
**Phases:** 2 | **Plans:** 4

### What Was Built
- Removed all legacy UI controls (settings landing page, DiagramInfo sidebar, non-C4 toolbar, Beta badge) — 610 lines deleted
- C4HierarchyTree sidebar with collapsible 4-level navigation and auto-highlight on drill-down
- Breadcrumb navigation showing current C4 hierarchy position with clickable ancestors
- Single-button "Generate All Diagrams" flow for first-visit experience
- Minimal 2-button toolbar (Regenerate + Show/Hide Changes) replacing the old configuration-heavy controls

### What Worked
- Two-phase structure (clear canvas → build new UI) prevented confusion about what to keep vs remove
- Visual verification checkpoints (15-02, 16-02) caught real bugs: sidebar highlight reactivity, generateAllDiagrams state churn
- Zustand selector pattern discovery during verification — field-level selectors are more reactive than full store subscription
- Small milestone scope (2 phases, 4 plans) shipped cleanly in 3 days with clear requirements

### What Was Inefficient
- GEN-01 partial gap (component/code require elementId) wasn't discovered until visual verification — earlier testing of the generation flow would have surfaced this
- Test regressions from Phase 16 (DiagramViewer.uicl.test.tsx crash, VisualMapTab.gen01.test.tsx timeout) — mocking Zustand selectors requires different patterns than full store mocks
- DiagramInfo.tsx dead code file not deleted during cleanup — oversight in Phase 15

### Patterns Established
- Zustand field-level selectors (`useStore(s => s.field)`) for reactive UI bindings — prevents stale renders
- generateAllDiagrams bypasses component state to avoid React re-render interference during multi-level async work
- TDD absence tests (test that removed UI is absent) as verification for cleanup phases

### Key Lessons
1. Visual verification checkpoints are worth the overhead — they caught 2 bugs that automated tests missed (sidebar reactivity, state churn)
2. Zustand mocking needs to match consumption pattern — selector-based components need selector-aware mocks
3. UI overhaul milestones benefit from strict remove-then-build phasing — reduces ambiguity about scope
4. Architectural constraints (elementId requirement) should be documented in requirements upfront, not discovered during verification

### Cost Observations
- Model mix: predominantly sonnet for execution, opus for planning/audit/milestone
- Notable: Smallest milestone yet (2 phases) — focused UI overhaul without generation pipeline changes

---

## Milestone: v1.4 — Repo-Stored Diagrams

**Shipped:** 2026-03-28
**Phases:** 4 | **Plans:** 8

### What Was Built
- ReefStorageService with atomic temp-then-rename writes, Zod schema validation, lazy `.reef/` directory creation
- Auto-generated `.gitattributes` marking SVGs as binary for clean diffs
- Write-through on every diagram generation (`.puml`, `.svg`, `.meta.json`)
- Instant `.reef/` import on repo add — stored SVGs loaded into LRU + SQLite, bypassing PlantUML
- SHA-256 source hash staleness detection with 2.5s debounced file change handling
- Stale-aware regeneration UI with confirmation dialog showing stale level count

### What Worked
- Linear 4-phase structure (foundation → write → read → regen) with clean dependency chain
- Atomic writes via temp-then-rename prevented corrupted `.reef/` files during interrupt
- Dependency injection for ReefStorageService made testing straightforward without filesystem mocks
- 2-day execution for 4 phases / 8 plans — tight scope maintained from v1.2 lesson

### What Was Inefficient
- STOR-03 partial: `hasNewerFiles` startup walk omits `.reef` from `IGNORED_DIRS` — discovered at audit, not during phase work
- REGEN-01 partial: async write-back timing means toast fires before `.reef/` is actually updated — race condition discovered at audit
- Pre-existing drill-down generation issue persisted through entire milestone — not addressed until v1.5

### Patterns Established
- `.reef/` folder convention for sharing diagram artifacts via git
- Source hash (SHA-256) alongside mtime for staleness detection — hash for `.reef/`, mtime for SQLite
- Additive feature patterns: new storage path added alongside existing SQLite, both coexist

### Key Lessons
1. Audit-discovered gaps (STOR-03, REGEN-01) are consistently timing/edge-case issues — main flows work, edges get missed
2. Pre-existing issues should be explicitly deferred or addressed — the drill-down generation bug persisted across 3 milestones
3. Two storage paths (SQLite + `.reef/`) create consistency challenges — need clear source-of-truth hierarchy

### Cost Observations
- Model mix: opus for planning/audit, sonnet for execution
- Notable: Matched v1.2's 2-day timeline with similar scope (4 phases, 8 plans)

---

## Milestone: v1.5 — Bug Fixes & Navigation Overhaul

**Shipped:** 2026-04-01
**Phases:** 3 | **Plans:** 6

### What Was Built
- Cache-first loadDiagram function — read-only path checking `.reef/` → LRU → SQLite, never generates
- Full Generate All for all 4 C4 levels with auto-discovered elementIds via PlantUML macro parsing
- Resizable sidebar via react-resizable-panels PanelGroup with persisted width
- Active level highlight with blue left-border accent strip
- Nested element tree in sidebar with drillable elements extracted from `.reef/` PlantUML files via IPC
- Breadcrumb level suffix showing C4 level in parentheses
- Code-level diagram rewrite with stereotyped rendering (`<<function>>`, `<<component>>`, `<<enumeration>>`)
- Static analyzer extended with ParameterInfo, EnumInfo types and extraction methods

### What Worked
- TDD RED-GREEN pattern used consistently across Phase 23 — tests written before implementation caught design issues early
- Three independent phases with clear ownership: navigation (21), UI (22), quality (23) — minimal cross-phase interference
- .reef/ as source of truth design principle (from v1.4) guided all Phase 21 decisions — loadDiagram is purely read-only
- Milestone audit passed on first attempt: 8/8 requirements, 3/3 phases, 12/12 integration checks

### What Was Inefficient
- SIDE-03 "by design" limitation not anticipated during requirements — sidebar element tree can't show component/code level elements because PlantUML macros don't expose child IDs
- Phase 22 had overlapping commits (22-01 appears twice in git log) — likely a rebase artifact
- SUMMARY one-liner fields inconsistently formatted across phases — CLI extraction failed for 4/6 summaries

### Patterns Established
- Cache-first navigation with skipLoadEffect ref to prevent double-load race conditions
- extractElementIds parsing PlantUML macros for elementId discovery — no storage lookup needed
- Two-phase generation (context+container fatal, component+code non-fatal) for resilient full generation
- Lifted collapse state pattern for PanelGroup to bypass minimum Panel size constraints
- Stereotyped PlantUML classes with directory-prefix matching for code-level diagrams

### Key Lessons
1. "By design" limitations should be identified during requirements, not discovered at audit — SIDE-03 partial was avoidable
2. Cache-first is the right default for navigation — read-only load eliminates an entire class of race conditions and data corruption bugs
3. SUMMARY files need consistent formatting for CLI extraction to work — frontmatter tooling should enforce structure
4. 3 phases with TDD coverage shipped cleanly in 4 days — the right size for a bug-fix milestone

### Cost Observations
- Model mix: opus for planning/audit/milestone, sonnet for execution
- Notable: First milestone where audit passed on first attempt with zero requirement gaps

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Timeline | Key Change |
|-----------|--------|-------|----------|------------|
| v1.0 | 4 | 11 | 4 days | Initial GSD workflow, TDD scaffolds |
| v1.1 | 6 | 19 | 4 days | Gap closure phases, audit-driven completion |
| v1.2 | 4 | 9 | 2 days | Tight scope per phase, dependency-driven ordering |
| v1.3 | 2 | 4 | 3 days | Remove-then-build phasing, visual verification checkpoints |
| v1.4 | 4 | 8 | 2 days | Atomic writes, hash-based staleness, .reef/ convention |
| v1.5 | 3 | 6 | 4 days | Cache-first navigation, TDD consistency, first clean audit |

### Top Lessons (Verified Across Milestones)

1. Audit before milestone completion catches integration gaps that individual phase verification misses (v1.1, v1.2, v1.3, v1.4)
2. Small, focused phases (1-3 plans) execute faster and more reliably than large phases (v1.1 Phase 5 vs v1.2-v1.5 all phases)
3. Gap closure plans after UAT are predictable and cheap — budget one per milestone (v1.1 Phase 10, v1.2 Plan 13-03)
4. Human verification tests accumulate without a forcing function — need process change (v1.1: 20 items, v1.2: 7 items, v1.3: test regressions)
5. Visual verification checkpoints catch bugs that automated tests miss — worth the overhead (v1.3: 2 bugs found)
6. Cache-first/read-only navigation eliminates entire classes of race conditions and data corruption (v1.5 lesson, applicable broadly)
7. "By design" limitations should be identified during requirements, not discovered at audit (v1.5 SIDE-03)
