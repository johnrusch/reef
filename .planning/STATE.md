---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Bug Fixes & Navigation Overhaul
status: verifying
stopped_at: Completed 22-02-PLAN.md
last_updated: "2026-03-30T23:14:30.069Z"
last_activity: 2026-03-30
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 4
  completed_plans: 4
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Users can quickly grasp unfamiliar codebase architecture through AI-generated C4 diagrams that update as code changes
**Current focus:** Phase 22 — sidebar-breadcrumb-overhaul

## Current Position

Phase: 22 (sidebar-breadcrumb-overhaul) — EXECUTING
Plan: 2 of 2
Status: Phase complete — ready for verification
Last activity: 2026-03-30

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- v1.0: 4 phases, 11 plans (4 days)
- v1.1: 6 phases, 19 plans (4 days)
- v1.2: 4 phases, 9 plans (2 days)
- v1.3: 2 phases, 4 plans (3 days)
- v1.4: 4 phases, 8 plans (2 days)
- Total shipped: 20 phases, 51 plans

## Accumulated Context

### Decisions

Recent decisions affecting v1.5 work:

- [v1.5 design]: .reef/ is the source of truth. SQLite and LRU cache are local performance optimizations only. Navigation must never silently regenerate or overwrite .reef/ data.
- [v1.4 carryover]: Drill-down clicks trigger generation instead of loading cached diagrams — primary fix target in Phase 21
- [v1.4 carryover]: STOR-03 partial — hasNewerFiles startup walk omits .reef from IGNORED_DIRS (address in Phase 21)
- [v1.4 carryover]: REGEN-01 partial — .reef/ write-back async timing; success toast fires before .reef/ updated
- [Phase 21-cache-first-navigation]: loadDiagram is purely read-only (never calls generate/updateState/storeSvg); breadcrumb/sidebar never fall back to generate; element click/command palette fall back only on cache miss
- [Phase 21-cache-first-navigation]: skipLoadEffect ref prevents Pitfall 5 double-load race condition in loadPersistedDiagram useEffect
- [Phase 21-cache-first-navigation]: extractElementIds parses PlantUML Container/Component macros to discover element IDs for next-level generation (no storage lookup needed)
- [Phase 21-cache-first-navigation]: generationQueueService uses two-phase approach: context+container fatal, component+code non-fatal with per-element generation
- [Phase 22-sidebar-breadcrumb-overhaul]: Collapse state lifted to DiagramViewer so PanelGroup can be bypassed entirely when collapsed — avoids 40px minimum Panel constraint
- [Phase 22]: repoPath passed as prop to C4HierarchyTree rather than reading from useRepositoryStore — DiagramViewer already has _repository?.path
- [Phase 22]: handleElementClick moved before handleTreeNavigate in DiagramViewer to resolve forward reference TypeScript error

### Blockers/Concerns

- [v1.3 carryover]: DiagramViewer.uicl.test.tsx Zustand mock regression — selector-aware mock needed
- [v1.2 carryover]: better-sqlite3 native module version mismatch blocks integration tests (pre-existing environment issue)

## Session Continuity

Last session: 2026-03-30T23:14:30.066Z
Stopped at: Completed 22-02-PLAN.md
Resume file: None

---
*v1.5 Bug Fixes & Navigation Overhaul — started 2026-03-28*
